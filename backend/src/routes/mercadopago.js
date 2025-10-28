import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { MercadoPagoOAuthService, MercadoPagoUtils } from '../services/mercadopago.js';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SERVICE_ROL_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * OAuth Routes for Mercado Pago Integration
 * Allows veterinary clinics to connect their Mercado Pago accounts
 */

/**
 * GET /mercadopago/oauth/authorize
 * Initiates OAuth flow by redirecting vet to Mercado Pago authorization page
 * Requires authenticated vet user
 */
router.get('/oauth/authorize', async (req, res) => {
  try {
    const { clinicaId, userType } = req.user;

    // Only veterinary clinics can connect Mercado Pago
    if (userType !== 'vet') {
      return res.status(403).json({
        message: 'Solo las clínicas veterinarias pueden conectar Mercado Pago'
      });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in database associated with clinic for validation
    await supabase
      .from('clinicas')
      .update({
        detalles: {
          oauth_state: state,
          oauth_initiated_at: new Date().toISOString(),
        }
      })
      .eq('id_clinica', clinicaId);

    // Get authorization URL from Mercado Pago
    const authUrl = MercadoPagoOAuthService.getAuthorizationURL(state);

    // Redirect to Mercado Pago authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      message: 'Error al iniciar conexión con Mercado Pago',
      error: error.message
    });
  }
});

/**
 * GET /mercadopago/oauth/callback
 * Handles OAuth callback from Mercado Pago
 * Exchanges authorization code for access token and stores it
 */
router.get('/oauth/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  try {
    // Check if Mercado Pago returned an error
    if (oauthError) {
      console.error('OAuth error from Mercado Pago:', oauthError);
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard-vet/mercadopago-setup?error=${oauthError}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard-vet/mercadopago-setup?error=missing_params`
      );
    }

    // Find clinic with matching state
    const { data: clinica, error: fetchError } = await supabase
      .from('clinicas')
      .select('id_clinica, detalles')
      .eq('detalles->>oauth_state', state)
      .single();

    if (fetchError || !clinica) {
      console.error('Invalid state parameter or clinic not found:', fetchError);
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard-vet/mercadopago-setup?error=invalid_state`
      );
    }

    // Check if OAuth was initiated recently (within 10 minutes)
    const initiatedAt = new Date(clinica.detalles?.oauth_initiated_at || 0);
    const now = new Date();
    const minutesElapsed = (now - initiatedAt) / (1000 * 60);

    if (minutesElapsed > 10) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard-vet/mercadopago-setup?error=expired_state`
      );
    }

    // Exchange authorization code for access token
    const tokenData = await MercadoPagoOAuthService.getAccessToken(code);

    // Calculate token expiration date
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + tokenData.expires_in);

    // Store tokens in database
    const { error: updateError } = await supabase
      .from('clinicas')
      .update({
        mercadopago_access_token: tokenData.access_token,
        mercadopago_refresh_token: tokenData.refresh_token,
        mercadopago_user_id: tokenData.user_id,
        mercadopago_public_key: tokenData.public_key,
        mp_token_expiration: expirationDate.toISOString(),
        mp_connected: true,
        detalles: null, // Clear OAuth state
      })
      .eq('id_clinica', clinica.id_clinica);

    if (updateError) {
      console.error('Error storing tokens:', updateError);
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard-vet/mercadopago-setup?error=store_failed`
      );
    }

    // Log successful connection
    console.log(`✅ Clinic ${clinica.id_clinica} successfully connected Mercado Pago`);

    // Redirect to success page
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard-vet/mercadopago-setup?success=true`
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard-vet/mercadopago-setup?error=callback_failed`
    );
  }
});

/**
 * POST /mercadopago/oauth/refresh
 * Manually refresh access token (can also be done automatically)
 * Requires authenticated vet user
 */
router.post('/oauth/refresh', async (req, res) => {
  try {
    const { clinicaId, userType } = req.user;

    if (userType !== 'vet') {
      return res.status(403).json({
        message: 'Solo las clínicas pueden refrescar el token'
      });
    }

    // Get clinic's current tokens
    const { data: clinica, error: fetchError } = await supabase
      .from('clinicas')
      .select('mercadopago_refresh_token, mp_connected')
      .eq('id_clinica', clinicaId)
      .single();

    if (fetchError || !clinica) {
      return res.status(404).json({
        message: 'Clínica no encontrada'
      });
    }

    if (!clinica.mp_connected || !clinica.mercadopago_refresh_token) {
      return res.status(400).json({
        message: 'Mercado Pago no está conectado'
      });
    }

    // Refresh the token
    const tokenData = await MercadoPagoOAuthService.refreshAccessToken(
      clinica.mercadopago_refresh_token
    );

    // Calculate new expiration date
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + tokenData.expires_in);

    // Update tokens in database
    const { error: updateError } = await supabase
      .from('clinicas')
      .update({
        mercadopago_access_token: tokenData.access_token,
        mercadopago_refresh_token: tokenData.refresh_token,
        mercadopago_public_key: tokenData.public_key,
        mp_token_expiration: expirationDate.toISOString(),
      })
      .eq('id_clinica', clinicaId);

    if (updateError) {
      console.error('Error updating refreshed tokens:', updateError);
      return res.status(500).json({
        message: 'Error al actualizar tokens'
      });
    }

    console.log(`✅ Clinic ${clinicaId} successfully refreshed Mercado Pago token`);

    res.status(200).json({
      message: 'Token refrescado exitosamente',
      expires_at: expirationDate.toISOString(),
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      message: 'Error al refrescar token',
      error: error.message
    });
  }
});

/**
 * GET /mercadopago/oauth/status
 * Check Mercado Pago connection status for clinic
 * Requires authenticated vet user
 */
router.get('/oauth/status', async (req, res) => {
  try {
    const { clinicaId, userType } = req.user;

    if (userType !== 'vet') {
      return res.status(403).json({
        message: 'Solo las clínicas pueden verificar el estado'
      });
    }

    const { data: clinica, error: fetchError } = await supabase
      .from('clinicas')
      .select('mp_connected, mp_token_expiration, mercadopago_user_id')
      .eq('id_clinica', clinicaId)
      .single();

    if (fetchError || !clinica) {
      return res.status(404).json({
        message: 'Clínica no encontrada'
      });
    }

    const isConnected = clinica.mp_connected || false;
    const needsRefresh = isConnected
      ? MercadoPagoUtils.needsTokenRefresh(clinica.mp_token_expiration)
      : false;

    res.status(200).json({
      connected: isConnected,
      needs_refresh: needsRefresh,
      user_id: clinica.mercadopago_user_id || null,
      expires_at: clinica.mp_token_expiration || null,
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.status(500).json({
      message: 'Error al verificar estado de conexión',
      error: error.message
    });
  }
});

/**
 * DELETE /mercadopago/oauth/disconnect
 * Disconnect Mercado Pago account from clinic
 * Requires authenticated vet user
 */
router.delete('/oauth/disconnect', async (req, res) => {
  try {
    const { clinicaId, userType } = req.user;

    if (userType !== 'vet') {
      return res.status(403).json({
        message: 'Solo las clínicas pueden desconectar Mercado Pago'
      });
    }

    // Check if clinic has any pending or unpaid appointments
    const { data: pendingAppointments, error: checkError } = await supabase
      .from('citas')
      .select('id_cita')
      .eq('id_clinica', clinicaId)
      .in('payment_status', ['awaiting_payment', 'pending'])
      .limit(1);

    if (checkError) {
      console.error('Error checking pending appointments:', checkError);
      return res.status(500).json({
        message: 'Error al verificar citas pendientes'
      });
    }

    if (pendingAppointments && pendingAppointments.length > 0) {
      return res.status(400).json({
        message: 'No puedes desconectar Mercado Pago mientras tengas citas con pagos pendientes',
        pending_appointments: pendingAppointments.length
      });
    }

    // Clear all Mercado Pago data
    const { error: updateError } = await supabase
      .from('clinicas')
      .update({
        mercadopago_access_token: null,
        mercadopago_refresh_token: null,
        mercadopago_user_id: null,
        mercadopago_public_key: null,
        mp_token_expiration: null,
        mp_connected: false,
      })
      .eq('id_clinica', clinicaId);

    if (updateError) {
      console.error('Error disconnecting Mercado Pago:', updateError);
      return res.status(500).json({
        message: 'Error al desconectar Mercado Pago'
      });
    }

    console.log(`✅ Clinic ${clinicaId} disconnected Mercado Pago`);

    res.status(200).json({
      message: 'Mercado Pago desconectado exitosamente'
    });
  } catch (error) {
    console.error('Error disconnecting Mercado Pago:', error);
    res.status(500).json({
      message: 'Error al desconectar Mercado Pago',
      error: error.message
    });
  }
});

export default router;
