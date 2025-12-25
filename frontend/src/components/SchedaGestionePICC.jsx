import { useState } from "react";
import { apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Download, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format, getDaysInMonth, startOfMonth } from "date-fns";
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

export const SchedaGestionePICC = ({ patientId, ambulatorio, schede, onRefresh }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedScheda, setSelectedScheda] = useState(null);
  const [newMese, setNewMese] = useState(format(new Date(), "yyyy-MM"));
  const [editingGiorni, setEditingGiorni] = useState({});
  const [editNote, setEditNote] = useState("");

  const generateMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year <= currentYear + 1; year++) {
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
    // Check if month already exists
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
      // Open edit dialog for new scheda
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

  const handleToggleDay = (day, itemId) => {
    setEditingGiorni((prev) => {
      const dayData = prev[day] || {};
      return {
        ...prev,
        [day]: {
          ...dayData,
          [itemId]: !dayData[itemId],
        },
      };
    });
  };

  const handleSaveEdit = async () => {
    try {
      await apiClient.put(`/schede-gestione-picc/${selectedScheda.id}`, {
        giorni: editingGiorni,
        note: editNote,
      });
      toast.success("Scheda aggiornata");
      setEditDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    }
  };

  const getDaysArray = (mese) => {
    const [year, month] = mese.split("-").map(Number);
    const daysCount = getDaysInMonth(new Date(year, month - 1));
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Schede Gestione Mensile PICC</h2>
          <p className="text-sm text-muted-foreground">
            Tracciamento giornaliero delle attività di gestione catetere
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
            <p className="text-muted-foreground">Nessuna scheda di gestione presente</p>
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
            const completedDays = Object.keys(scheda.giorni || {}).length;
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
                        {completedDays}/{totalDays} giorni
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info("Funzione download in sviluppo");
                        }}
                      >
                        <Download className="w-4 h-4" />
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
            <DialogTitle>Nuova Scheda Mensile</DialogTitle>
            <DialogDescription>
              Seleziona il mese per la nuova scheda di gestione PICC
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="capitalize">
              Scheda {selectedScheda && format(new Date(selectedScheda.mese + "-01"), "MMMM yyyy", { locale: it })}
            </DialogTitle>
            <DialogDescription>
              Clicca sulle celle per registrare le attività giornaliere
            </DialogDescription>
          </DialogHeader>

          {selectedScheda && (
            <div className="space-y-4">
              <ScrollArea className="h-[50vh]">
                <div className="table-responsive">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-primary text-primary-foreground p-2 text-left min-w-[150px]">
                          Attività
                        </th>
                        {getDaysArray(selectedScheda.mese).map((day) => (
                          <th
                            key={day}
                            className="bg-primary text-primary-foreground p-2 min-w-[32px] text-center"
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GESTIONE_ITEMS.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="sticky left-0 z-10 bg-muted p-2 font-medium">
                            {item.label}
                          </td>
                          {getDaysArray(selectedScheda.mese).map((day) => {
                            const isChecked = editingGiorni[day]?.[item.id];
                            return (
                              <td
                                key={day}
                                className={`p-1 text-center cursor-pointer hover:bg-accent transition-colors ${
                                  isChecked ? "bg-primary/10" : ""
                                }`}
                                onClick={() => handleToggleDay(day, item.id)}
                              >
                                {isChecked ? (
                                  <Check className="w-4 h-4 mx-auto text-primary" />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
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
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSaveEdit} data-testid="save-scheda-gestione-btn">
                  Salva Modifiche
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
