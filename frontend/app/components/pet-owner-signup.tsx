import type React from "react";

import { useState, useMemo } from "react";
import { PawPrintIcon as Paw, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { StatusDialog } from "./StatusDialog";

import { zodResolver } from "@hookform/resolvers/zod";
import { set, useForm } from "react-hook-form";
import { z } from "zod";
import { ownerFormSchema } from "~/zodSchemas/ownerFormSchema";
import { useNavigate } from "react-router";

const dogBreeds = [
  "Criollo (Sin raza)",
  "affenpinscher",
  "africano",
  "airedale terrier",
  "akita",
  "appenzeller",
  "kelpie australiano",
  "pastor australiano",
  "bakharwal indio",
  "basenji",
  "beagle",
  "bluetick",
  "borzoi",
  "bouvier",
  "boxer",
  "border collie",
  "brabanzón",
  "briard",
  "buhund noruego",
  "bulldog de Boston",
  "bulldog inglés",
  "bulldog francés",
  "bullterrier de Staffordshire",
  "perro boyero australiano",
  "cavapoo",
  "chihuahua",
  "chippiparai indio",
  "chow chow",
  "clumber spaniel",
  "cockapoo",
  "coonhound",
  "corgi galés de Cardigan",
  "coton de Tulear",
  "dachshund (teckel)",
  "dálmata",
  "gran danés",
  "perro danés-sueco",
  "lebrel escocés",
  "dhole",
  "dingo",
  "dóberman",
  "elkhound noruego",
  "entlebucher",
  "perro esquimal americano",
  "perro lapphund finlandés",
  "bichón frisé",
  "gaddi indio",
  "pastor alemán",
  "galgo indio",
  "galgo italiano",
  "groenendael",
  "habanero",
  "lebrel afgano",
  "basset hound",
  "bloodhound",
  "fresh puddle",
  "foxhound inglés",
  "podenco ibicenco",
  "plott hound",
  "coonhound de Walker",
  "husky siberiano",
  "keeshond",
  "kelpie",
  "kombai",
  "komondor",
  "kuvasz",
  "labradoodle",
  "labrador",
  "labrador retriever",
  "leonberger",
  "lhasa apso",
  "malamute de Alaska",
  "pastor belga malinois",
  "maltés",
  "bullmastiff",
  "mastín inglés",
  "mastín indio",
  "mastín tibetano",
  "perro sin pelo mexicano",
  "mestizo",
  "boyero de Berna",
  "boyero suizo",
  "mudhol indio",
  "terranova",
  "otterhound",
  "caucásico ovcharka",
  "papillón",
  "perro paria indio",
  "pequinés",
  "pembroke corgi galés",
  "pinscher miniatura",
  "pitbull",
  "braco alemán",
  "braco alemán de pelo largo",
  "pomerania",
  "caniche mediano",
  "caniche miniatura",
  "caniche estándar",
  "caniche toy",
  "pug",
  "puggle",
  "montaña de los Pirineos",
  "rajapalayam indio",
  "redbone coonhound",
  "retriever de Chesapeake",
  "retriever de pelo rizado",
  "retriever de pelo liso",
  "golden retriever",
  "perro crestado rodesiano",
  "rottweiler",
  "saluki",
  "samoyedo",
  "schipperke",
  "schnauzer gigante",
  "schnauzer miniatura",
  "segugio italiano",
  "setter inglés",
  "setter Gordon",
  "setter irlandés",
  "shar pei",
  "perro ovejero inglés",
  "perro ovejero indio",
  "shetland sheepdog",
  "shiba inu",
  "shih tzu",
  "spaniel Blenheim",
  "spaniel bretón",
  "cocker spaniel",
  "spaniel irlandés",
  "spaniel japonés",
  "spaniel de Sussex",
  "spaniel galés",
  "spitz indio",
  "spitz japonés",
  "springer spaniel inglés",
  "san Bernardo",
  "terrier americano",
  "terrier australiano",
  "terrier bedlington",
  "terrier border",
  "terrier cairn",
  "terrier dandie dinmont",
  "fox terrier",
  "terrier irlandés",
  "terrier azul de Kerry",
  "terrier lakeland",
  "terrier norfolk",
  "terrier norwich",
  "terrier patterdale",
  "terrier russell",
  "terrier escocés",
  "terrier sealyham",
  "terrier sedoso",
  "terrier tibetano",
  "terrier toy",
  "terrier galés",
  "terrier west highland",
  "terrier wheaten",
  "terrier yorkshire",
  "pastor belga tervuren",
  "vizsla",
  "perro de agua español",
  "weimaraner",
  "whippet",
  "lobero irlandés",
];

const catBreeds = [
  "Criollo (Sin raza)",
  "abisinio",
  "americano de pelo corto",
  "americano de pelo rizado",
  "american bobtail",
  "american curl",
  "angora turco",
  "asiático",
  "balinés",
  "bengalí",
  "birmano",
  "bombay",
  "bosque de noruega",
  "británico de pelo corto",
  "británico de pelo largo",
  "burmilla",
  "californiano brillante",
  "cartujo",
  "ceilanés",
  "chantilly-tiffany",
  "colorpoint de pelo corto",
  "cornish rex",
  "cymric",
  "devon rex",
  "don sphynx",
  "europeo de pelo corto",
  "fold escocés",
  "gato egipcio",
  "gato exótico",
  "gato hawaiano",
  "havana brown",
  "himalayo",
  "japonés bobtail",
  "javanés",
  "khao manee",
  "korat",
  "kurilian bobtail",
  "laPerm",
  "maine coon",
  "manx",
  "mau egipcio",
  "munchkin",
  "nebelung",
  "ocicat",
  "oriental de pelo corto",
  "oriental de pelo largo",
  "persa",
  "peterbald",
  "pixie-bob",
  "ragamuffin",
  "ragdoll",
  "ruso azul",
  "sagrado de birmania",
  "savannah",
  "selkirk rex",
  "serengeti",
  "siberiano",
  "siamés",
  "singapura",
  "snowshoe",
  "somalí",
  "sphynx",
  "thai",
  "tonkinés",
  "toyger",
  "turkish van",
  "york chocolate",
];

interface PetOwnerSignupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
}

type OwnerFormData = z.infer<typeof ownerFormSchema>;

export function PetOwnerSignup({
  open,
  onOpenChange,
  onBack,
}: PetOwnerSignupProps) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    type: "" as "loading" | "error" | "success",
    message: "",
  });

  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    trigger,
    setValue,
    watch,
    reset,
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerFormSchema),
    mode: "onTouched",
    defaultValues: {
      userName: "",
      email: "",
      phone: "",
      password: "",
      agreeTerms: false,
      petName: "",
      petAge: 0,
      petSpecies: "",
      petBreed: "",
      petGender: "",
      petWeight: 0,
    },
  });

  const [petFiles, setPetFiles] = useState({
    petHistory: null as File | null,
    petPhoto: null as File | null,
  });

  const formValues = watch();

  const breedOptions = useMemo(() => {
    const breeds = formValues.petSpecies === "canino" ? dogBreeds : catBreeds;
    return breeds.map((breed) => (
      <SelectItem key={breed} value={breed}>
        {breed}
      </SelectItem>
    ));
  }, [formValues.petSpecies]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.name) return;
    const file = e.target.files[0];
    const name = e.target.name;

    console.log(e.target.files);
    setPetFiles({
      ...petFiles,
      [name]: file,
    });
  };

  const handleNextStep = async () => {
    const isValid = await trigger([
      "userName",
      "email",
      "phone",
      "password",
      "agreeTerms",
    ]);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = async (data: OwnerFormData) => {
    if (step === 1) {
      handleNextStep();
    } else {
      try {
        setStatusDialog({
          open: true,
          type: "loading",
          message: "Procesando registro...",
        });

        //objeto formData para enviar datos y archivos
        const formData = new FormData();

        // Agregar todos los campos de texto al FormData
        formData.append("userName", data.userName);
        formData.append("email", data.email);
        formData.append("phone", data.phone);
        formData.append("password", data.password);
        formData.append("petName", data.petName);
        formData.append("petAge", data.petAge.toString());
        formData.append("petSpecies", data.petSpecies);
        formData.append("petBreed", data.petBreed);
        formData.append("petGender", data.petGender);
        formData.append("petWeight", data.petWeight.toString());

        // Añadir los archivos si existen
        if (petFiles.petHistory) {
          formData.append("petHistory", petFiles.petHistory);
        }
        if (petFiles.petPhoto) {
          formData.append("petPhoto", petFiles.petPhoto);
        }

        setIsLoading(true);

        //modificar url para utilizar la del backend en render
        const response = await fetch(`${API_URL}/register/user`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 400) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Datos inválidos");
          } else if (response.status === 409) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "El usuario ya se encuentra registrado"
            );
          } else {
            throw new Error("Error en el servidor");
          }
        }

        const result = await response.json();
        console.log("Respuesta del servidor:", result);

        // Mostrar diálogo de éxito
        setStatusDialog({
          open: true,
          type: "success",
          message:
            "Tu cuenta ha sido creada exitosamente. ¡Bienvenido a nuestra plataforma!",
        });
      } catch (error: unknown) {
        console.error("Error al registrar:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Ha ocurrido un error en el registro.";

        setStatusDialog({
          open: true,
          type: "error",
          message: errorMessage,
        });
      } finally {
        reset();
        petFiles.petHistory = null;
        petFiles.petPhoto = null;
        setStep(1);
        setIsLoading(false);
      }

      console.log("Datos de solicitud:", data, petFiles);

      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex-shrink-0">
            {step === 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="mr-2 h-8 w-8"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex flex-col items-center justify-center w-full">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Paw className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle>Registro como Dueño de Mascota</DialogTitle>
              <DialogDescription>
                {step === 1
                  ? "Información personal"
                  : "Información de la mascota"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-full overflow-hidden gap-2">
          {step === 1 ? (
            <div className="overflow-y-auto flex-1 px-1">
              <div className="grid gap-2">
                <Label htmlFor="userName">Nombre y Apellido</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="userName"
                    placeholder="Tu nombre"
                    className="pl-9"
                    {...register("userName")}
                  />
                </div>
                {errors.userName && (
                  <p className="text-sm text-red-500">
                    {errors.userName.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2 mt-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-9"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-2 mt-2">
                <Label htmlFor="phone">Telefono</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="321 1234567"
                    className="pl-9"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="grid gap-2 mt-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Crea una contraseña"
                    className="pl-9"
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  <p>La contraseña debe contener:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Al menos 8 caracteres</li>
                    <li>Al menos una letra minúscula (a-z)</li>
                    <li>Al menos una letra mayúscula (A-Z)</li>
                    <li>Al menos un número (0-9)</li>
                    <li>Al menos un carácter especial (!@#$%^&*)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreeTerms"
                  className="mr-2"
                  onCheckedChange={(checked) => {
                    setValue("agreeTerms", checked === true);
                  }}
                  {...register("agreeTerms")}
                />
                <label htmlFor="agreeTerms" className="text-sm">
                  Acepto los términos y condiciones de la política de privacidad
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="text-sm text-red-500 mt-1.5">
                  {errors.agreeTerms.message}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 px-1">
              <div className="grid gap-4">
                <Label htmlFor="petName">Nombre de tu mascota</Label>
                <div className="relative">
                  <Paw className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="petName"
                    placeholder="Nombre de tu mascota"
                    className="pl-9"
                    type="text"
                    {...register("petName")}
                  />
                </div>
                {errors.petName && touchedFields.petName && (
                  <p className="text-sm text-red-500 mt-1.5">
                    {errors.petName.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petAge">Edad</Label>
                <div className="relative">
                  <Paw className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="petAge"
                    placeholder="Edad de tu mascota"
                    className="pl-9"
                    type="number"
                    min={0}
                    max={50}
                    {...register("petAge", { valueAsNumber: true })}
                  />
                </div>
                {errors.petAge && touchedFields.petAge && (
                  <p className="text-sm text-red-500 mt-1.5">
                    {errors.petAge.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petSpecies">Especie</Label>
                <div className="relative">
                  <Select
                    name="petSpecies"
                    onValueChange={(value) => setValue("petSpecies", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Especie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="canino">Canino</SelectItem>
                      <SelectItem value="felino">Felino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.petSpecies && touchedFields.petSpecies && (
                  <p className="text-sm text-red-500 mt-1.5">
                    {errors.petSpecies.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petBreed">Raza</Label>
                <div className="relative">
                  <Select
                    name="petBreed"
                    onValueChange={(value) => setValue("petBreed", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Raza" />
                    </SelectTrigger>
                    <SelectContent>{breedOptions}</SelectContent>
                  </Select>
                </div>
                {errors.petBreed && touchedFields.petBreed && (
                  <p className="text-sm text-red-500 mt-1.5">
                    {errors.petBreed.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petGender">Género</Label>
                <div className="relative">
                  <Select
                    name="petGender"
                    onValueChange={(value) => setValue("petGender", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Hembra">Hembra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.petGender && touchedFields.petGender && (
                  <p className="text-sm text-red-500 mt-1.5">
                    {errors.petGender.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petWeight">Peso (kg)</Label>
                <div className="relative">
                  <Paw className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="petWeight"
                    placeholder="Peso en kilogramos"
                    className="pl-9"
                    type="number"
                    min={0.1}
                    max={150}
                    step={0.1}
                    {...register("petWeight", { valueAsNumber: true })}
                  />
                </div>
                {errors.petWeight && touchedFields.petWeight && (
                  <p className="text-sm text-red-500 mt-1.5">
                    {errors.petWeight.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petHistory">Historial médico (opcional)</Label>
                <p className="text-sm text-gray-600">
                  Puedes adjuntar el historial médico de tu mascota
                </p>
                <div className="relative">
                  {petFiles.petHistory ? (
                    <div className="flex items-center justify-between px-3 py-2 border rounded-md">
                      <div className="flex items-center">
                        <Paw className="h-4 w-4 text-primary mr-2" />
                        <span className="text-sm font-medium text-blue-500">
                          {petFiles.petHistory.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPetFiles({ ...petFiles, petHistory: null })
                        }
                      >
                        <span className="text-red-600">eliminar</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Paw className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="petHistory"
                        name="petHistory"
                        className="pl-9"
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="petPhoto">Foto (Opcional)</Label>
                <div className="relative">
                  {petFiles.petPhoto ? (
                    <div className="flex items-center justify-between px-3 py-2 border rounded-md">
                      <div className="flex items-center">
                        <Paw className="h-4 w-4 text-primary mr-2" />
                        <span className="text-sm font-medium text-blue-500">
                          {petFiles.petPhoto.name}
                        </span>
                        {petFiles.petPhoto.type.startsWith("image/") && (
                          <div className="ml-2 h-8 w-8 overflow-hidden rounded-md">
                            <img
                              src={URL.createObjectURL(petFiles.petPhoto)}
                              alt="Vista previa"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPetFiles({ ...petFiles, petPhoto: null })
                        }
                      >
                        <span className="text-red-600">eliminar</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Paw className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="petPhoto"
                        name="petPhoto"
                        className="pl-9"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Volver
            </Button>
            {step === 1 ? (
              <Button type="button" onClick={handleNextStep}>
                Continuar
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="mr-2">Procesando...</span>
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>

      </DialogContent>
      <StatusDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog((prev) => ({ ...prev, open }))}
        onSuccess={() => onOpenChange(false)}
        type={statusDialog.type}
        message={statusDialog.message}
      />
    </Dialog>
  );
}
