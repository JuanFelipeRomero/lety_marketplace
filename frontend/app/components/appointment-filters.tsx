import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { FilterX, ChevronDown } from "lucide-react";
import { Separator } from "~/components/ui/separator";

interface FilterOption {
  id: number | string;
  name: string;
}

interface AppointmentFiltersProps {
  pets: FilterOption[];
  clinics: FilterOption[];
  selectedPets: number[];
  selectedStatuses: string[];
  selectedClinics: number[];
  onPetsChange: (ids: number[]) => void;
  onStatusChange: (statuses: string[]) => void;
  onClinicsChange: (ids: number[]) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { id: "confirmed", name: "Confirmada" },
  { id: "pending", name: "Pendiente" },
  { id: "completed", name: "Completada" },
  { id: "cancelled", name: "Cancelada" },
];

export function AppointmentFilters({
  pets,
  clinics,
  selectedPets,
  selectedStatuses,
  selectedClinics,
  onPetsChange,
  onStatusChange,
  onClinicsChange,
  onReset,
}: AppointmentFiltersProps) {
  const [petPopoverOpen, setPetPopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [clinicPopoverOpen, setClinicPopoverOpen] = useState(false);

  const totalFiltersActive =
    selectedPets.length + selectedStatuses.length + selectedClinics.length;

  const handlePetToggle = (petId: number) => {
    if (selectedPets.includes(petId)) {
      onPetsChange(selectedPets.filter((id) => id !== petId));
    } else {
      onPetsChange([...selectedPets, petId]);
    }
  };

  const handleStatusToggle = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const handleClinicToggle = (clinicId: number) => {
    if (selectedClinics.includes(clinicId)) {
      onClinicsChange(selectedClinics.filter((id) => id !== clinicId));
    } else {
      onClinicsChange([...selectedClinics, clinicId]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Pet Filter */}
      <Popover open={petPopoverOpen} onOpenChange={setPetPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 border-slate-300 hover:border-[#007A55] hover:bg-[#007A55]/5 transition-colors"
          >
            <span className="font-medium">Mascota</span>
            {selectedPets.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-[#007A55] text-white hover:bg-[#006644]"
              >
                {selectedPets.length}
              </Badge>
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-4">
            <h4 className="font-semibold text-sm mb-3">Filtrar por mascota</h4>
            {pets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay mascotas disponibles
              </p>
            ) : (
              <div className="space-y-3">
                {pets.map((pet) => (
                  <div
                    key={pet.id}
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => handlePetToggle(pet.id as number)}
                  >
                    <Checkbox
                      id={`pet-${pet.id}`}
                      checked={selectedPets.includes(pet.id as number)}
                      onCheckedChange={() => handlePetToggle(pet.id as number)}
                    />
                    <Label
                      htmlFor={`pet-${pet.id}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {pet.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {selectedPets.length > 0 && (
              <>
                <Separator className="my-3" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPetsChange([])}
                  className="w-full text-slate-600 hover:text-slate-900"
                >
                  Limpiar selección
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 border-slate-300 hover:border-[#007A55] hover:bg-[#007A55]/5 transition-colors"
          >
            <span className="font-medium">Estado</span>
            {selectedStatuses.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-[#007A55] text-white hover:bg-[#006644]"
              >
                {selectedStatuses.length}
              </Badge>
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-4">
            <h4 className="font-semibold text-sm mb-3">Filtrar por estado</h4>
            <div className="space-y-3">
              {STATUS_OPTIONS.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => handleStatusToggle(status.id)}
                >
                  <Checkbox
                    id={`status-${status.id}`}
                    checked={selectedStatuses.includes(status.id)}
                    onCheckedChange={() => handleStatusToggle(status.id)}
                  />
                  <Label
                    htmlFor={`status-${status.id}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {status.name}
                  </Label>
                </div>
              ))}
            </div>
            {selectedStatuses.length > 0 && (
              <>
                <Separator className="my-3" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusChange([])}
                  className="w-full text-slate-600 hover:text-slate-900"
                >
                  Limpiar selección
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clinic Filter */}
      <Popover open={clinicPopoverOpen} onOpenChange={setClinicPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 border-slate-300 hover:border-[#007A55] hover:bg-[#007A55]/5 transition-colors"
          >
            <span className="font-medium">Veterinaria</span>
            {selectedClinics.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-[#007A55] text-white hover:bg-[#006644]"
              >
                {selectedClinics.length}
              </Badge>
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-4">
            <h4 className="font-semibold text-sm mb-3">
              Filtrar por veterinaria
            </h4>
            {clinics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay veterinarias disponibles
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {clinics.map((clinic) => (
                  <div
                    key={clinic.id}
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => handleClinicToggle(clinic.id as number)}
                  >
                    <Checkbox
                      id={`clinic-${clinic.id}`}
                      checked={selectedClinics.includes(clinic.id as number)}
                      onCheckedChange={() =>
                        handleClinicToggle(clinic.id as number)
                      }
                    />
                    <Label
                      htmlFor={`clinic-${clinic.id}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {clinic.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {selectedClinics.length > 0 && (
              <>
                <Separator className="my-3" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClinicsChange([])}
                  className="w-full text-slate-600 hover:text-slate-900"
                >
                  Limpiar selección
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reset All Filters Button */}
      {totalFiltersActive > 0 && (
        <>
          <div className="h-8 w-px bg-slate-300" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <FilterX className="mr-2 h-4 w-4" />
            Limpiar filtros ({totalFiltersActive})
          </Button>
        </>
      )}
    </div>
  );
}
