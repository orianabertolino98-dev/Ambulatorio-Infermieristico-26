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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Copy, Check, Edit2, Calendar, Trash2, ChevronLeft, ChevronRight, Save } from "lucide-react";
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
const CellInput = ({ value, onChange, colId, itemId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");

  const handleQuickSelect = (val) => {
    onChange(colId, itemId, val);
    setIsOpen(false);
  };

  const handleCustomSave = () => {
    onChange(colId, itemId, inputValue);
    setIsOpen(false);
  };

  const displayValue = value || "-";
  const hasValue = value && value !== "-";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`w-full h-full min-h-[36px] text-xs font-medium rounded transition-colors border ${
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScheda, setSelectedScheda] = useState(null);
  const [newMese, setNewMese] = useState(format(new Date(), "yyyy-MM"));
  
  // State for dynamic columns (dates)
  const [columns, setColumns] = useState([]); // Array of date strings: ["2025-12-01", "2025-12-05", ...]
  const [columnData, setColumnData] = useState({}); // { "2025-12-01": { lavaggio_mani: "Sì", ... }, ... }
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  const generateMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
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

  // Get available dates for the selected month
  const getAvailableDates = (mese) => {
    const [year, month] = mese.split("-").map(Number);
    const daysCount = getDaysInMonth(new Date(year, month - 1));
    const dates = [];
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      dates.push({
        value: dateStr,
        label: format(new Date(year, month - 1, day), "d MMMM", { locale: it }),
      });
    }
    return dates;
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
      
      // Open the new scheda for editing
      handleOpenEdit(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione");
    }
  };

  const handleOpenEdit = (scheda) => {
    setSelectedScheda(scheda);
    
    // Convert old format (days 1-31) to new format (dates) if needed
    const existingData = scheda.giorni || {};
    const dates = [];
    const data = {};
    
    // Check if it's old format (numeric keys) or new format (date strings)
    const keys = Object.keys(existingData);
    if (keys.length > 0) {
      const firstKey = keys[0];
      if (firstKey.includes("-")) {
        // New format - date strings
        keys.forEach(dateStr => {
          dates.push(dateStr);
          data[dateStr] = existingData[dateStr];
        });
      } else {
        // Old format - convert day numbers to dates
        const [year, month] = scheda.mese.split("-").map(Number);
        keys.forEach(dayNum => {
          const dateStr = `${year}-${month.toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
          dates.push(dateStr);
          data[dateStr] = existingData[dayNum];
        });
      }
    }
    
    // Sort dates chronologically
    dates.sort();
    
    setColumns(dates);
    setColumnData(data);
    setEditNote(scheda.note || "");
    setEditDialogOpen(true);
  };

  const handleAddColumn = (dateStr) => {
    if (columns.includes(dateStr)) {
      toast.error("Questa data è già presente");
      return;
    }
    const newColumns = [...columns, dateStr].sort();
    setColumns(newColumns);
    setColumnData(prev => ({ ...prev, [dateStr]: {} }));
  };

  const handleRemoveColumn = (dateStr) => {
    setColumns(prev => prev.filter(d => d !== dateStr));
    setColumnData(prev => {
      const { [dateStr]: removed, ...rest } = prev;
      return rest;
    });
  };

  const handleCellChange = (colId, itemId, value) => {
    setColumnData((prev) => {
      const colData = prev[colId] || {};
      if (!value || value === "") {
        const { [itemId]: removed, ...rest } = colData;
        return { ...prev, [colId]: rest };
      }
      return {
        ...prev,
        [colId]: {
          ...colData,
          [itemId]: value,
        },
      };
    });
  };

  const handleCopyFromPrevious = (currentColIndex) => {
    if (currentColIndex <= 0) {
      toast.error("Non c'è una colonna precedente da copiare");
      return;
    }
    
    const prevCol = columns[currentColIndex - 1];
    const currentCol = columns[currentColIndex];
    const prevData = columnData[prevCol];
    
    if (!prevData || Object.keys(prevData).length === 0) {
      toast.error("La colonna precedente non ha dati");
      return;
    }

    setColumnData(prev => ({
      ...prev,
      [currentCol]: { ...prevData },
    }));
    toast.success("Dati copiati dalla colonna precedente");
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      // Convert to storage format
      const giorni = {};
      columns.forEach(dateStr => {
        if (columnData[dateStr] && Object.keys(columnData[dateStr]).length > 0) {
          giorni[dateStr] = columnData[dateStr];
        }
      });

      await apiClient.put(`/schede-gestione-picc/${selectedScheda.id}`, {
        giorni,
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

  const handleDelete = async () => {
    if (!selectedScheda) return;
    
    try {
      await apiClient.delete(`/schede-gestione-picc/${selectedScheda.id}`);
      toast.success("Scheda eliminata");
      setDeleteDialogOpen(false);
      setEditDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const getFilledColumnsCount = (scheda) => {
    const giorni = scheda.giorni || {};
    return Object.keys(giorni).length;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Schede Medicazione PICC</h2>
          <p className="text-sm text-muted-foreground">
            Tracciamento mensile - aggiungi date e compila le attività
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
            const completedCols = getFilledColumnsCount(scheda);
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
                        {completedCols} medicazioni
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScheda(scheda);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
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

      {/* Edit Dialog - New Design */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[98vw] max-h-[95vh] p-4">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="capitalize flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheda {selectedScheda && format(new Date(selectedScheda.mese + "-01"), "MMMM yyyy", { locale: it })}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Elimina Scheda
              </Button>
            </div>
            <DialogDescription>
              Aggiungi date con il pulsante + e compila le attività. Usa il pulsante copia per duplicare i dati dalla colonna precedente.
            </DialogDescription>
          </DialogHeader>

          {selectedScheda && (
            <div className="space-y-3">
              {/* Add Date Section */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <Label className="text-sm font-medium text-emerald-700">Aggiungi Data:</Label>
                <Select
                  onValueChange={(dateStr) => handleAddColumn(dateStr)}
                >
                  <SelectTrigger className="w-[200px] bg-white">
                    <SelectValue placeholder="Seleziona data..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDates(selectedScheda.mese)
                      .filter(d => !columns.includes(d.value))
                      .map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-emerald-600">
                  {columns.length} date aggiunte
                </span>
              </div>

              {/* Table with scrollbars */}
              <div className="border rounded-lg overflow-hidden" style={{ maxHeight: "55vh" }}>
                <div className="overflow-auto" style={{ maxHeight: "55vh" }}>
                  {columns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mb-4 opacity-50" />
                      <p>Nessuna data aggiunta</p>
                      <p className="text-sm">Usa il selettore sopra per aggiungere date</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 z-20">
                        <tr>
                          <th className="sticky left-0 z-30 bg-emerald-600 text-white p-3 text-left min-w-[180px] font-semibold">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Attività
                            </div>
                          </th>
                          {columns.map((dateStr, idx) => {
                            const date = new Date(dateStr);
                            return (
                              <th
                                key={dateStr}
                                className="bg-emerald-600 text-white p-2 min-w-[90px] text-center font-medium"
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-base font-bold">
                                    {format(date, "d", { locale: it })}
                                  </span>
                                  <span className="text-xs opacity-80">
                                    {format(date, "MMM", { locale: it })}
                                  </span>
                                  <div className="flex gap-1 mt-1">
                                    {idx > 0 && (
                                      <button
                                        className="p-0.5 hover:bg-emerald-500 rounded"
                                        onClick={() => handleCopyFromPrevious(idx)}
                                        title="Copia da precedente"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      className="p-0.5 hover:bg-red-500 rounded"
                                      onClick={() => handleRemoveColumn(dateStr)}
                                      title="Rimuovi colonna"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {GESTIONE_ITEMS.map((item, rowIdx) => (
                          <tr key={item.id} className={rowIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <td className="sticky left-0 z-10 bg-slate-100 p-2 font-medium border-b text-sm whitespace-nowrap">
                              {item.label}
                            </td>
                            {columns.map((dateStr) => (
                              <td key={dateStr} className="p-1 border-b border-r border-gray-200">
                                <CellInput
                                  value={columnData[dateStr]?.[item.id] || ""}
                                  onChange={handleCellChange}
                                  colId={dateStr}
                                  itemId={item.id}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

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
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa scheda?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La scheda medicazione verrà eliminata definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SchedaGestionePICC;
