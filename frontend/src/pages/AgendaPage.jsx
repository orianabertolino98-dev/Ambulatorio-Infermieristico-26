import { useState, useEffect, useCallback } from "react";
import { useAmbulatorio, apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, subDays, startOfWeek, isWeekend, parseISO, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarIcon,
  Search,
  X,
  Syringe,
  Bandage,
  Droplets,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";

const TIME_SLOTS = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "15:00", "15:30", "16:00", "16:30"
];

const PRESTAZIONI_PICC = [
  { id: "medicazione_semplice", label: "Medicazione semplice", icon: Bandage },
  { id: "irrigazione_catetere", label: "Irrigazione catetere", icon: Droplets },
];

const PRESTAZIONI_MED = [
  { id: "medicazione_semplice", label: "Medicazione semplice", icon: Bandage },
  { id: "fasciatura_semplice", label: "Fasciatura semplice", icon: CircleDot },
  { id: "iniezione_terapeutica", label: "Iniezione terapeutica", icon: Syringe },
  { id: "catetere_vescicale", label: "Catetere vescicale", icon: Droplets },
];

// Get next working day
const getNextWorkingDay = (date) => {
  let d = new Date(date);
  while (isWeekend(d)) {
    d = addDays(d, 1);
  }
  return d;
};

export default function AgendaPage() {
  const { ambulatorio } = useAmbulatorio();
  const [currentDate, setCurrentDate] = useState(() => getNextWorkingDay(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPrestazioni, setSelectedPrestazioni] = useState([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isVillaGinestre = ambulatorio === "villa_ginestre";

  const fetchData = useCallback(async () => {
    try {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const [appointmentsRes, patientsRes, holidaysRes] = await Promise.all([
        apiClient.get("/appointments", {
          params: { ambulatorio, data: dateStr },
        }),
        apiClient.get("/patients", {
          params: { ambulatorio, status: "in_cura" },
        }),
        apiClient.get("/calendar/holidays", {
          params: { anno: currentDate.getFullYear() },
        }),
      ]);

      setAppointments(appointmentsRes.data);
      setPatients(patientsRes.data);
      setHolidays(holidaysRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  }, [ambulatorio, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchQuery.length >= 1 && selectedSlot) {
      const tipo = selectedSlot.tipo;
      const filtered = patients.filter((p) => {
        const matchesSearch =
          p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.cognome.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTipo =
          p.tipo === tipo || p.tipo === "PICC_MED";
        return matchesSearch && matchesTipo;
      });
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients([]);
    }
  }, [searchQuery, patients, selectedSlot]);

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevDay = () => {
    let newDate = subDays(currentDate, 1);
    while (isWeekend(newDate)) {
      newDate = subDays(newDate, 1);
    }
    setCurrentDate(newDate);
  };
  const goToNextDay = () => {
    let newDate = addDays(currentDate, 1);
    while (isWeekend(newDate)) {
      newDate = addDays(newDate, 1);
    }
    setCurrentDate(newDate);
  };

  const isHoliday = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return isWeekend(date) || holidays.includes(dateStr);
  };

  const getAppointmentsForSlot = (ora, tipo) => {
    return appointments.filter((a) => a.ora === ora && a.tipo === tipo);
  };

  const handleSlotClick = (ora, tipo) => {
    if (isHoliday(currentDate)) return;
    const existing = getAppointmentsForSlot(ora, tipo);
    if (existing.length >= 2) {
      toast.error("Slot pieno (max 2 pazienti)");
      return;
    }
    setSelectedSlot({ ora, tipo });
    setSearchQuery("");
    setSelectedPatient(null);
    setSelectedPrestazioni([]);
    setDialogOpen(true);
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery(`${patient.cognome} ${patient.nome}`);
    setFilteredPatients([]);
  };

  const handlePrestazioneToggle = (prestazioneId) => {
    setSelectedPrestazioni((prev) =>
      prev.includes(prestazioneId)
        ? prev.filter((p) => p !== prestazioneId)
        : [...prev, prestazioneId]
    );
  };

  const handleAddAppointment = async () => {
    if (!selectedPatient) {
      toast.error("Seleziona un paziente");
      return;
    }
    if (selectedPrestazioni.length === 0) {
      toast.error("Seleziona almeno una prestazione");
      return;
    }

    try {
      await apiClient.post("/appointments", {
        patient_id: selectedPatient.id,
        ambulatorio,
        data: format(currentDate, "yyyy-MM-dd"),
        ora: selectedSlot.ora,
        tipo: selectedSlot.tipo,
        prestazioni: selectedPrestazioni,
      });

      toast.success("Appuntamento aggiunto");
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'aggiunta");
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      await apiClient.delete(`/appointments/${appointmentId}`);
      toast.success("Appuntamento rimosso");
      fetchData();
    } catch (error) {
      toast.error("Errore nella rimozione");
    }
  };

  const prestazioni = selectedSlot?.tipo === "PICC" ? PRESTAZIONI_PICC : PRESTAZIONI_MED;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const holidayToday = isHoliday(currentDate);

  return (
    <div className="animate-fade-in" data-testid="agenda-page">
      {/* Header */}
      <div className="agenda-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground text-sm">
            Gestione appuntamenti giornalieri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevDay}
            data-testid="agenda-prev-day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[200px] justify-start font-normal"
                data-testid="agenda-date-picker"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(currentDate, "EEEE d MMMM yyyy", { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDate(date);
                    setCalendarOpen(false);
                  }
                }}
                locale={it}
                disabled={(date) => isWeekend(date)}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextDay}
            data-testid="agenda-next-day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button variant="secondary" size="sm" onClick={goToToday}>
            Oggi
          </Button>
        </div>
      </div>

      {/* Holiday notice */}
      {holidayToday && (
        <div className="mb-4 p-4 bg-slate-100 border border-slate-200 rounded-lg">
          <p className="text-sm text-slate-600 font-medium">
            Giorno non lavorativo - Prenotazioni non disponibili
          </p>
        </div>
      )}

      {/* Agenda Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="table-responsive">
            <div className="agenda-grid" style={{ minWidth: "600px" }}>
              {/* Headers */}
              <div className="agenda-grid-header">Ora</div>
              {!isVillaGinestre && (
                <div className="agenda-grid-header bg-emerald-600">PICC</div>
              )}
              {isVillaGinestre ? (
                <div className="agenda-grid-header bg-emerald-600" style={{ gridColumn: "span 2" }}>
                  PICC
                </div>
              ) : (
                <div className="agenda-grid-header">MED</div>
              )}

              {/* Time slots */}
              {TIME_SLOTS.map((ora) => (
                <div key={ora} className="contents">
                  <div className="agenda-grid-time">{ora}</div>

                  {/* PICC Column */}
                  <div
                    className={`agenda-grid-cell ${holidayToday ? "holiday" : ""}`}
                    onClick={() => !holidayToday && handleSlotClick(ora, "PICC")}
                    data-testid={`agenda-slot-${ora}-picc`}
                  >
                    {getAppointmentsForSlot(ora, "PICC").map((apt) => (
                      <div
                        key={apt.id}
                        className="agenda-patient-chip picc group relative"
                        title={apt.prestazioni.join(", ")}
                      >
                        {apt.patient_cognome}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAppointment(apt.id);
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {!holidayToday && getAppointmentsForSlot(ora, "PICC").length < 2 && (
                      <div className="text-xs text-muted-foreground opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center h-full">
                        <Plus className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* MED Column (only for PTA Centro) */}
                  {!isVillaGinestre && (
                    <div
                      className={`agenda-grid-cell ${holidayToday ? "holiday" : ""}`}
                      onClick={() => !holidayToday && handleSlotClick(ora, "MED")}
                      data-testid={`agenda-slot-${ora}-med`}
                    >
                      {getAppointmentsForSlot(ora, "MED").map((apt) => (
                        <div
                          key={apt.id}
                          className="agenda-patient-chip med group relative"
                          title={apt.prestazioni.join(", ")}
                        >
                          {apt.patient_cognome}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAppointment(apt.id);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {!holidayToday && getAppointmentsForSlot(ora, "MED").length < 2 && (
                        <div className="text-xs text-muted-foreground opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center h-full">
                          <Plus className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Appuntamento</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <>
                  {format(currentDate, "d MMMM yyyy", { locale: it })} alle {selectedSlot.ora} - {selectedSlot.tipo}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient Search */}
            <div className="space-y-2">
              <Label>Paziente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="agenda-patient-search"
                  placeholder="Cerca per nome o cognome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredPatients.length > 0 && (
                <ScrollArea className="h-40 border rounded-md">
                  <div className="p-2">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        data-testid={`agenda-patient-option-${patient.id}`}
                        className="p-2 hover:bg-accent rounded cursor-pointer flex items-center justify-between"
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <span className="font-medium">
                          {patient.cognome} {patient.nome}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          patient.tipo === "PICC" ? "bg-emerald-100 text-emerald-700" :
                          patient.tipo === "MED" ? "bg-blue-100 text-blue-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>
                          {patient.tipo}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {selectedPatient && (
                <div className="p-2 bg-accent rounded-md flex items-center justify-between">
                  <span>
                    <strong>{selectedPatient.cognome} {selectedPatient.nome}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchQuery("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Prestazioni */}
            <div className="space-y-2">
              <Label>Prestazioni</Label>
              <div className="grid gap-2">
                {prestazioni.map((prest) => (
                  <div
                    key={prest.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPrestazioni.includes(prest.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => handlePrestazioneToggle(prest.id)}
                    data-testid={`agenda-prestazione-${prest.id}`}
                  >
                    <Checkbox
                      checked={selectedPrestazioni.includes(prest.id)}
                      onCheckedChange={() => handlePrestazioneToggle(prest.id)}
                    />
                    <prest.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{prest.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={handleAddAppointment}
                disabled={!selectedPatient || selectedPrestazioni.length === 0}
                data-testid="agenda-add-appointment-btn"
              >
                Aggiungi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
