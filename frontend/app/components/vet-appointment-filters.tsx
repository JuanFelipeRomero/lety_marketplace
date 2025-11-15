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

interface VetAppointmentFiltersProps {
  pets: FilterOption[];
  owners: FilterOption[];
  selectedPets: number[];
  selectedStatuses: string[];
  selectedOwners: number[];
  onPetsChange: (ids: number[]) => void;
  onStatusChange: (statuses: string[]) => void;
  onOwnersChange: (ids: number[]) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { id: "Pendiente", name: "Pendiente" },
  { id: "Confirmada", name: "Confirmada" },
  { id: "Completada", name: "Completada" },
  { id: "Cancelada", name: "Cancelada" },
  { id: "Rechazada", name: "Rechazada" },
];

export function VetAppointmentFilters({
  pets,
  owners,
  selectedPets,
  selectedStatuses,
  selectedOwners,
  onPetsChange,
  onStatusChange,
  onOwnersChange,
  onReset,
}: VetAppointmentFiltersProps) {
  const [petPopoverOpen, setPetPopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);

  const totalFiltersActive =
    selectedPets.length + selectedStatuses.length + selectedOwners.length;

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

  const handleOwnerToggle = (ownerId: number) => {
    if (selectedOwners.includes(ownerId)) {
      onOwnersChange(selectedOwners.filter((id) => id !== ownerId));
    } else {
      onOwnersChange([...selectedOwners, ownerId]);
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
              <div className="space-y-3 max-h-64 overflow-y-auto">
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

      {/* Owner Filter */}
      <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 border-slate-300 hover:border-[#007A55] hover:bg-[#007A55]/5 transition-colors"
          >
            <span className="font-medium">Dueño</span>
            {selectedOwners.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-[#007A55] text-white hover:bg-[#006644]"
              >
                {selectedOwners.length}
              </Badge>
            )}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-4">
            <h4 className="font-semibold text-sm mb-3">Filtrar por dueño</h4>
            {owners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay dueños disponibles
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {owners.map((owner) => (
                  <div
                    key={owner.id}
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => handleOwnerToggle(owner.id as number)}
                  >
                    <Checkbox
                      id={`owner-${owner.id}`}
                      checked={selectedOwners.includes(owner.id as number)}
                      onCheckedChange={() =>
                        handleOwnerToggle(owner.id as number)
                      }
                    />
                    <Label
                      htmlFor={`owner-${owner.id}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {owner.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {selectedOwners.length > 0 && (
              <>
                <Separator className="my-3" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOwnersChange([])}
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
