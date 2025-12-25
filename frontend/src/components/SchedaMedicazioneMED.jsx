import { useState } from "react";
import { apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Copy, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const FONDO_OPTIONS = [
  { id: "granuleggiante", label: "Granuleggiante" },
  { id: "fibrinoso", label: "Fibrinoso" },
  { id: "necrotico", label: "Necrotico" },
  { id: "infetto", label: "Infetto" },
  { id: "biofilmato", label: "Biofilmato" },
];

const MARGINI_OPTIONS = [
  { id: "attivi", label: "Attivi" },
  { id: "piantati", label: "Piantati" },
  { id: "in_estensione", label: "In Estensione" },
  { id: "a_scogliera", label: "A Scogliera" },
];

const CUTE_OPTIONS = [
  { id: "integra", label: "Integra" },
  { id: "secca", label: "Secca" },
  { id: "arrossata", label: "Arrossata" },
  { id: "macerata", label: "Macerata" },
  { id: "ipercheratosica", label: "Ipercheratosica" },
];

const ESSUDATO_QUANTITA = [
  { id: "assente", label: "Assente" },
  { id: "moderato", label: "Moderato" },
  { id: "abbondante", label: "Abbondante" },
];

const ESSUDATO_TIPO = [
  { id: "sieroso", label: "Sieroso" },
  { id: "ematico", label: "Ematico" },
  { id: "infetto", label: "Infetto" },
];

const DEFAULT_MEDICAZIONE = `La lesione è stata trattata seguendo le 4 fasi del Wound Hygiene:
Detersione con Prontosan
Debridement e Riattivazione dei margini
Medicazione: `;

export const SchedaMedicazioneMED = ({ patientId, ambulatorio, schede, onRefresh }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedScheda, setSelectedScheda] = useState(null);
  const [newScheda, setNewScheda] = useState({
    data_compilazione: format(new Date(), "yyyy-MM-dd"),
    fondo: [],
    margini: [],
    cute_perilesionale: [],
    essudato_quantita: "",
    essudato_tipo: [],
    medicazione: DEFAULT_MEDICAZIONE,
    prossimo_cambio: "",
    firma: "",
  });

  const handleToggle = (field, value) => {
    setNewScheda((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSingleSelect = (field, value) => {
    setNewScheda((prev) => ({
      ...prev,
      [field]: prev[field] === value ? "" : value,
    }));
  };

  const handleCreate = async () => {
    try {
      await apiClient.post("/schede-medicazione-med", {
        patient_id: patientId,
        ambulatorio,
        ...newScheda,
      });
      toast.success("Scheda creata");
      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error) {
      toast.error("Errore nella creazione");
    }
  };

  const handleCopyFromPrevious = () => {
    if (schede.length > 0) {
      const lastScheda = schede[0];
      setNewScheda({
        ...newScheda,
        data_compilazione: format(new Date(), "yyyy-MM-dd"),
        fondo: lastScheda.fondo || [],
        margini: lastScheda.margini || [],
        cute_perilesionale: lastScheda.cute_perilesionale || [],
        essudato_quantita: lastScheda.essudato_quantita || "",
        essudato_tipo: lastScheda.essudato_tipo || [],
        medicazione: lastScheda.medicazione || DEFAULT_MEDICAZIONE,
      });
      toast.success("Dati copiati dalla scheda precedente");
    }
  };

  const resetForm = () => {
    setNewScheda({
      data_compilazione: format(new Date(), "yyyy-MM-dd"),
      fondo: [],
      margini: [],
      cute_perilesionale: [],
      essudato_quantita: "",
      essudato_tipo: [],
      medicazione: DEFAULT_MEDICAZIONE,
      prossimo_cambio: "",
      firma: "",
    });
  };

  const SelectionChips = ({ options, selected, onToggle, multiple = true }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = multiple
          ? selected.includes(opt.id)
          : selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`selection-chip ${isSelected ? "selected" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Schede Medicazione MED</h2>
        <Button onClick={() => setDialogOpen(true)} data-testid="new-scheda-med-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuova Scheda
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
              Crea la prima scheda
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {schede.map((scheda) => (
            <Card
              key={scheda.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setSelectedScheda(scheda);
                setViewDialogOpen(true);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Scheda del {format(new Date(scheda.data_compilazione), "d MMMM yyyy", { locale: it })}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Download functionality would go here
                      toast.info("Funzione download in sviluppo");
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {scheda.fondo?.map((f) => (
                    <span key={f} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {f}
                    </span>
                  ))}
                  {scheda.margini?.map((m) => (
                    <span key={m} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                      {m}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nuova Scheda Medicazione MED</DialogTitle>
            <DialogDescription>
              Compila i campi della scheda di medicazione
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Header with date and copy button */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label>Data Compilazione</Label>
                  <Input
                    type="date"
                    value={newScheda.data_compilazione}
                    onChange={(e) =>
                      setNewScheda({ ...newScheda, data_compilazione: e.target.value })
                    }
                  />
                </div>
                {schede.length > 0 && (
                  <Button variant="outline" onClick={handleCopyFromPrevious}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copia da precedente
                  </Button>
                )}
              </div>

              {/* Fondo Lesione */}
              <div className="form-section">
                <div className="form-section-title">Fondo Lesione</div>
                <SelectionChips
                  options={FONDO_OPTIONS}
                  selected={newScheda.fondo}
                  onToggle={(id) => handleToggle("fondo", id)}
                />
              </div>

              {/* Margini Lesione */}
              <div className="form-section">
                <div className="form-section-title">Margini Lesione</div>
                <SelectionChips
                  options={MARGINI_OPTIONS}
                  selected={newScheda.margini}
                  onToggle={(id) => handleToggle("margini", id)}
                />
              </div>

              {/* Cute Perilesionale */}
              <div className="form-section">
                <div className="form-section-title">Cute Perilesionale</div>
                <SelectionChips
                  options={CUTE_OPTIONS}
                  selected={newScheda.cute_perilesionale}
                  onToggle={(id) => handleToggle("cute_perilesionale", id)}
                />
              </div>

              {/* Essudato */}
              <div className="form-section">
                <div className="form-section-title">Essudato</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Quantità</Label>
                    <SelectionChips
                      options={ESSUDATO_QUANTITA}
                      selected={newScheda.essudato_quantita}
                      onToggle={(id) => handleSingleSelect("essudato_quantita", id)}
                      multiple={false}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Tipologia</Label>
                    <SelectionChips
                      options={ESSUDATO_TIPO}
                      selected={newScheda.essudato_tipo}
                      onToggle={(id) => handleToggle("essudato_tipo", id)}
                    />
                  </div>
                </div>
              </div>

              {/* Medicazione */}
              <div className="form-section">
                <div className="form-section-title">Medicazione Praticata</div>
                <Textarea
                  value={newScheda.medicazione}
                  onChange={(e) =>
                    setNewScheda({ ...newScheda, medicazione: e.target.value })
                  }
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>

              {/* Footer */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prossimo Cambio</Label>
                  <Input
                    type="date"
                    value={newScheda.prossimo_cambio}
                    onChange={(e) =>
                      setNewScheda({ ...newScheda, prossimo_cambio: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Firma Operatore</Label>
                  <Input
                    value={newScheda.firma}
                    onChange={(e) =>
                      setNewScheda({ ...newScheda, firma: e.target.value })
                    }
                    placeholder="Nome operatore"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreate} data-testid="save-scheda-med-btn">
              Salva Scheda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Scheda del {selectedScheda && format(new Date(selectedScheda.data_compilazione), "d MMMM yyyy", { locale: it })}
            </DialogTitle>
          </DialogHeader>

          {selectedScheda && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Fondo Lesione</Label>
                  <p>{selectedScheda.fondo?.join(", ") || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Margini Lesione</Label>
                  <p>{selectedScheda.margini?.join(", ") || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cute Perilesionale</Label>
                  <p>{selectedScheda.cute_perilesionale?.join(", ") || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Essudato</Label>
                  <p>
                    Quantità: {selectedScheda.essudato_quantita || "-"} | 
                    Tipo: {selectedScheda.essudato_tipo?.join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Medicazione Praticata</Label>
                  <p className="whitespace-pre-wrap">{selectedScheda.medicazione || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Prossimo Cambio</Label>
                    <p>
                      {selectedScheda.prossimo_cambio
                        ? format(new Date(selectedScheda.prossimo_cambio), "d MMM yyyy", { locale: it })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Firma</Label>
                    <p>{selectedScheda.firma || "-"}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedaMedicazioneMED;
