import { useState } from "react";
import { apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Copy, Check, Edit2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, getDaysInMonth } from "date-fns";
import { it } from "date-fns/locale";

const GESTIONE_ITEMS = [
  { id: "lavaggio_mani", label: "Lavaggio mani" },
  { id: "guanti_non_sterili", label: "Guanti non sterili" },
  { id: "guanti_sterili", label: "Guanti sterili" },
  { id: "rimozione_medicazione", label: "Rimozione medicazione" },
  { id: "ispezione_sito", label: "Ispezione sito" },
  { id: "sito_dolente", label: "Sito dolente" },
  { id: "edema_arrossamento", label: "Edema/Arrossamento" },
  { id: "disinfezione_sito", label: "Disinfezione sito" },
  { id: "fissaggio_sutureless", label: "Fissaggio sutureless" },
  { id: "medicazione_trasparente", label: "Medicazione trasparente" },
  { id: "lavaggio_fisiologica", label: "Lavaggio fisiologica" },
  { id: "disinfezione_clorexidina", label: "Disinfezione clorexidina 2%" },
  { id: "difficolta_aspirazione", label: "Difficoltà aspirazione" },
  { id: "difficolta_iniezione", label: "Difficoltà iniezione" },
  { id: "medicazione_clorexidina", label: "Medicazione clorexidina" },
  { id: "port_protector", label: "Port Protector" },
  { id: "lock_eparina", label: "Lock eparina" },
  { id: "sostituzione_set", label: "Sostituzione set" },
  { id: "febbre", label: "Febbre" },
  { id: "emocoltura", label: "Emocoltura" },
];

// Quick input component for cell editing
const CellInput = ({ value, onChange, day, itemId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");

  const handleQuickSelect = (val) => {
    onChange(day, itemId, val);
    setIsOpen(false);
  };

  const handleCustomSave = () => {
    onChange(day, itemId, inputValue);
    setIsOpen(false);
  };

  const displayValue = value || "-";
  const hasValue = value && value !== "-";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`w-full h-full min-h-[32px] text-xs font-medium rounded transition-colors border ${
            hasValue
              ? value.toLowerCase() === "si" || value.toLowerCase() === "sì"
                ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
                : value.toLowerCase() === "no"
                ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-300"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
              : "hover:bg-accent text-muted-foreground border-transparent hover:border-gray-300"
          }`}
        >
          {displayValue}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="center">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              variant={value === "Sì" ? "default" : "outline"}
              className="h-9 text-sm font-medium"
              onClick={() => handleQuickSelect("Sì")}
            >
              Sì
            </Button>
            <Button
              size="sm"
              variant={value === "No" ? "default" : "outline"}
              className="h-9 text-sm font-medium"
              onClick={() => handleQuickSelect("No")}
            >
              No
            </Button>
          </div>
          <div className="flex gap-1">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, 5))}
              placeholder="Testo..."
              className="h-9 text-sm"
              maxLength={5}
            />
            <Button size="sm" className="h-9 px-3" onClick={handleCustomSave}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
          {hasValue && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-8 text-xs text-muted-foreground"
              onClick={() => handleQuickSelect("")}
            >
              Cancella
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const SchedaGestionePICC = ({ patientId, ambulatorio, schede, onRefresh }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedScheda, setSelectedScheda] = useState(null);
  const [newMese, setNewMese] = useState(format(new Date(), "yyyy-MM"));
  const [editingGiorni, setEditingGiorni] = useState({});
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  const generateMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    // Include past year for historical data
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 1; month <= 12; month++) {
        options.push({
          value: `${year}-${month.toString().padStart(2, "0")}`,
          label: format(new Date(year, month - 1), "MMMM yyyy", { locale: it }),
        });
      }
    }
    return options;
  };

  const handleCreate = async () => {
    if (schede.some((s) => s.mese === newMese)) {
      toast.error("Esiste già una scheda per questo mese");
      return;
    }

    try {
      const response = await apiClient.post("/schede-gestione-picc", {
        patient_id: patientId,
        ambulatorio,
        mese: newMese,
        giorni: {},
        note: "",
      });
      toast.success("Scheda mensile creata");
      setDialogOpen(false);
      onRefresh();
      setSelectedScheda(response.data);
      setEditingGiorni(response.data.giorni || {});
      setEditNote(response.data.note || "");
      setEditDialogOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione");
    }
  };

  const handleOpenEdit = (scheda) => {
    setSelectedScheda(scheda);
    setEditingGiorni(scheda.giorni || {});
    setEditNote(scheda.note || "");
    setEditDialogOpen(true);
  };

  const handleCellChange = (day, itemId, value) => {
    setEditingGiorni((prev) => {
      const dayData = prev[day] || {};
      if (!value || value === "") {
        const { [itemId]: removed, ...rest } = dayData;
        if (Object.keys(rest).length === 0) {
          const { [day]: removedDay, ...restDays } = prev;
          return restDays;
        }
        return { ...prev, [day]: rest };
      }
      return {
        ...prev,
        [day]: {
          ...dayData,
          [itemId]: value,
        },
      };
    });
  };

  // Copy from previous day function
  const handleCopyFromPreviousDay = (currentDay) => {
    const prevDay = currentDay - 1;
    if (prevDay < 1) {
      toast.error("Non c'è un giorno precedente da copiare");
      return;
    }
    
    const prevDayData = editingGiorni[prevDay];
    if (!prevDayData || Object.keys(prevDayData).length === 0) {
      toast.error("Il giorno precedente non ha dati");
      return;
    }

    setEditingGiorni((prev) => ({
      ...prev,
      [currentDay]: { ...prevDayData },
    }));
    toast.success(`Dati copiati dal giorno ${prevDay}`);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/schede-gestione-picc/${selectedScheda.id}`, {
        giorni: editingGiorni,
        note: editNote,
      });
      toast.success("Scheda salvata");
      setEditDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const getDaysArray = (mese) => {
    const [year, month] = mese.split("-").map(Number);
    const daysCount = getDaysInMonth(new Date(year, month - 1));
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  };

  const getFilledDaysCount = (giorni) => {
    return Object.keys(giorni || {}).length;
  };

  // Get formatted date for a specific day in the month
  const getDateForDay = (mese, day) => {
    const [year, month] = mese.split("-").map(Number);
    return format(new Date(year, month - 1, day), "dd/MM/yyyy");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Schede Medicazione PICC</h2>
          <p className="text-sm text-muted-foreground">
            Tracciamento mensile - clicca sulle celle per inserire Sì/No o note brevi (max 5 caratteri)
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="new-scheda-gestione-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Mese
        </Button>
      </div>

      {schede.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nessuna scheda presente</p>
            <Button
              variant="link"
              onClick={() => setDialogOpen(true)}
              className="mt-2"
            >
              Crea la prima scheda mensile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {schede.map((scheda) => {
            const completedDays = getFilledDaysCount(scheda.giorni);
            const totalDays = getDaysInMonth(new Date(scheda.mese + "-01"));
            return (
              <Card
                key={scheda.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleOpenEdit(scheda)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">
                      {format(new Date(scheda.mese + "-01"), "MMMM yyyy", { locale: it })}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {completedDays}/{totalDays} giorni compilati
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(scheda);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${(completedDays / totalDays) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Scheda Mensile PICC</DialogTitle>
            <DialogDescription>
              Seleziona il mese per la nuova scheda medicazione PICC
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mese</Label>
              <Select value={newMese} onValueChange={setNewMese}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreate}>Crea Scheda</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Improved visualization */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[98vw] max-h-[95vh] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="capitalize flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Scheda {selectedScheda && format(new Date(selectedScheda.mese + "-01"), "MMMM yyyy", { locale: it })}
            </DialogTitle>
            <DialogDescription>
              Clicca su una cella per inserire Sì/No o una nota breve. Usa il pulsante copia per copiare i dati dal giorno precedente.
            </DialogDescription>
          </DialogHeader>

          {selectedScheda && (
            <div className="space-y-3">
              <ScrollArea className="h-[60vh]">
                <div className="overflow-x-auto pb-4">
                  <table className="w-full text-sm border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-20">
                      <tr>
                        <th className="sticky left-0 z-30 bg-emerald-600 text-white p-3 text-left min-w-[180px] rounded-tl-lg font-semibold">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Attività
                          </div>
                        </th>
                        {getDaysArray(selectedScheda.mese).map((day, idx) => (
                          <th
                            key={day}
                            className={`bg-emerald-600 text-white p-1 min-w-[44px] text-center font-medium ${
                              idx === getDaysArray(selectedScheda.mese).length - 1 ? "rounded-tr-lg" : ""
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-base font-bold">{day}</span>
                              <span className="text-[10px] opacity-80">
                                {getDateForDay(selectedScheda.mese, day).slice(0, 5)}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                      {/* Copy row */}
                      <tr>
                        <td className="sticky left-0 z-20 bg-emerald-100 p-2 font-medium text-emerald-700 text-xs">
                          <Copy className="w-4 h-4 inline mr-1" /> Copia da precedente
                        </td>
                        {getDaysArray(selectedScheda.mese).map((day) => (
                          <td key={day} className="bg-emerald-50 p-1 text-center">
                            {day > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-emerald-200"
                                onClick={() => handleCopyFromPreviousDay(day)}
                                title={`Copia dal giorno ${day - 1}`}
                              >
                                <Copy className="w-3 h-3 text-emerald-600" />
                              </Button>
                            )}
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GESTIONE_ITEMS.map((item, rowIdx) => (
                        <tr key={item.id} className={rowIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="sticky left-0 z-10 bg-slate-100 p-2 font-medium border-b text-sm whitespace-nowrap">
                            {item.label}
                          </td>
                          {getDaysArray(selectedScheda.mese).map((day) => (
                            <td key={day} className="p-0.5 border-b border-r border-gray-200">
                              <CellInput
                                value={editingGiorni[day]?.[item.id] || ""}
                                onChange={handleCellChange}
                                day={day}
                                itemId={item.id}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>

              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  placeholder="Note aggiuntive..."
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving} data-testid="save-scheda-gestione-btn">
                  {saving ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedaGestionePICC;
