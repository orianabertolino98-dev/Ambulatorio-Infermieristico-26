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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const TIPO_CATETERE_OPTIONS = [
  { id: "cvd_non_tunnellizzato", label: "CVC non tunnellizzato (breve termine)" },
  { id: "cvd_tunnellizzato", label: "CVC tunnellizzato (lungo termine)" },
  { id: "picc", label: "CVC medio termine (PICC)" },
  { id: "port", label: "PORT (lungo termine)" },
  { id: "midline", label: "Midline" },
];

const VENA_OPTIONS = [
  { id: "basilica", label: "Basilica" },
  { id: "cefalica", label: "Cefalica" },
  { id: "brachiale", label: "Brachiale" },
];

const MODALITA_OPTIONS = [
  { id: "emergenza", label: "Emergenza" },
  { id: "urgenza", label: "Urgenza" },
  { id: "elezione", label: "Elezione" },
];

const MOTIVAZIONE_OPTIONS = [
  { id: "chemioterapia", label: "Chemioterapia" },
  { id: "difficolta_vene", label: "Difficoltà nel reperire vene" },
  { id: "terapia_prolungata", label: "Terapia prolungata" },
  { id: "monitoraggio", label: "Monitoraggio invasivo" },
  { id: "altro", label: "Altro" },
];

export const SchedaImpiantoPICC = ({ patientId, ambulatorio, schede, onRefresh }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedScheda, setSelectedScheda] = useState(null);
  const [newScheda, setNewScheda] = useState({
    data_impianto: format(new Date(), "yyyy-MM-dd"),
    tipo_catetere: "",
    sede: "",
    braccio: "",
    vena: "",
    exit_site_cm: "",
    ecoguidato: false,
    igiene_mani: "",
    precauzioni_barriera: false,
    disinfettante: "",
    sutureless_device: false,
    medicazione_trasparente: false,
    controllo_rx: false,
    controllo_ecg: false,
    modalita: "",
    motivazione: "",
    operatore: "",
    note: "",
  });

  const handleCreate = async () => {
    if (!newScheda.tipo_catetere || !newScheda.sede) {
      toast.error("Compila i campi obbligatori");
      return;
    }

    try {
      await apiClient.post("/schede-impianto-picc", {
        patient_id: patientId,
        ambulatorio,
        ...newScheda,
      });
      toast.success("Scheda impianto creata");
      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error) {
      toast.error("Errore nella creazione");
    }
  };

  const resetForm = () => {
    setNewScheda({
      data_impianto: format(new Date(), "yyyy-MM-dd"),
      tipo_catetere: "",
      sede: "",
      braccio: "",
      vena: "",
      exit_site_cm: "",
      ecoguidato: false,
      igiene_mani: "",
      precauzioni_barriera: false,
      disinfettante: "",
      sutureless_device: false,
      medicazione_trasparente: false,
      controllo_rx: false,
      controllo_ecg: false,
      modalita: "",
      motivazione: "",
      operatore: "",
      note: "",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Schede Impianto PICC</h2>
        <Button onClick={() => setDialogOpen(true)} data-testid="new-scheda-impianto-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuova Scheda
        </Button>
      </div>

      {schede.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nessuna scheda impianto presente</p>
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
                    Impianto del {format(new Date(scheda.data_impianto), "d MMMM yyyy", { locale: it })}
                  </CardTitle>
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
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {TIPO_CATETERE_OPTIONS.find((t) => t.id === scheda.tipo_catetere)?.label || scheda.tipo_catetere}
                  {scheda.sede && ` - ${scheda.sede}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nuova Scheda Impianto PICC</DialogTitle>
            <DialogDescription>
              Compila i dati dell'impianto del catetere
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data Impianto *</Label>
                  <Input
                    type="date"
                    value={newScheda.data_impianto}
                    onChange={(e) =>
                      setNewScheda({ ...newScheda, data_impianto: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo di Catetere *</Label>
                  <Select
                    value={newScheda.tipo_catetere}
                    onValueChange={(value) =>
                      setNewScheda({ ...newScheda, tipo_catetere: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_CATETERE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PICC Positioning */}
              <div className="form-section">
                <div className="form-section-title">Posizionamento PICC</div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Braccio</Label>
                    <Select
                      value={newScheda.braccio}
                      onValueChange={(value) =>
                        setNewScheda({ ...newScheda, braccio: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dx">Destro</SelectItem>
                        <SelectItem value="sn">Sinistro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vena</Label>
                    <Select
                      value={newScheda.vena}
                      onValueChange={(value) =>
                        setNewScheda({ ...newScheda, vena: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        {VENA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Exit-site (cm)</Label>
                    <Input
                      value={newScheda.exit_site_cm}
                      onChange={(e) =>
                        setNewScheda({ ...newScheda, exit_site_cm: e.target.value })
                      }
                      placeholder="es: 35"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Sede *</Label>
                  <Input
                    value={newScheda.sede}
                    onChange={(e) =>
                      setNewScheda({ ...newScheda, sede: e.target.value })
                    }
                    placeholder="Descrizione sede di inserimento"
                  />
                </div>
              </div>

              {/* Procedure Details */}
              <div className="form-section">
                <div className="form-section-title">Dettagli Procedura</div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ecoguidato"
                      checked={newScheda.ecoguidato}
                      onCheckedChange={(checked) =>
                        setNewScheda({ ...newScheda, ecoguidato: !!checked })
                      }
                    />
                    <Label htmlFor="ecoguidato">Impianto ecoguidato</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Igiene delle mani</Label>
                    <Select
                      value={newScheda.igiene_mani}
                      onValueChange={(value) =>
                        setNewScheda({ ...newScheda, igiene_mani: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lavaggio_antisettico">Lavaggio antisettico</SelectItem>
                        <SelectItem value="frizione_alcolica">Frizione alcolica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="precauzioni_barriera"
                      checked={newScheda.precauzioni_barriera}
                      onCheckedChange={(checked) =>
                        setNewScheda({ ...newScheda, precauzioni_barriera: !!checked })
                      }
                    />
                    <Label htmlFor="precauzioni_barriera">
                      Massime precauzioni di barriera (berretto, maschera, camice sterile, guanti sterili, telo sterile)
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Disinfezione cute</Label>
                    <Select
                      value={newScheda.disinfettante}
                      onValueChange={(value) =>
                        setNewScheda({ ...newScheda, disinfettante: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clorexidina_2">Clorexidina 2% alcolica</SelectItem>
                        <SelectItem value="iodiopovidone">Iodiopovidone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sutureless"
                        checked={newScheda.sutureless_device}
                        onCheckedChange={(checked) =>
                          setNewScheda({ ...newScheda, sutureless_device: !!checked })
                        }
                      />
                      <Label htmlFor="sutureless">Sutureless device</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="medicazione_trasparente"
                        checked={newScheda.medicazione_trasparente}
                        onCheckedChange={(checked) =>
                          setNewScheda({ ...newScheda, medicazione_trasparente: !!checked })
                        }
                      />
                      <Label htmlFor="medicazione_trasparente">Medicazione trasparente</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="controllo_rx"
                        checked={newScheda.controllo_rx}
                        onCheckedChange={(checked) =>
                          setNewScheda({ ...newScheda, controllo_rx: !!checked })
                        }
                      />
                      <Label htmlFor="controllo_rx">Controllo RX</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="controllo_ecg"
                        checked={newScheda.controllo_ecg}
                        onCheckedChange={(checked) =>
                          setNewScheda({ ...newScheda, controllo_ecg: !!checked })
                        }
                      />
                      <Label htmlFor="controllo_ecg">Controllo ECG</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Info */}
              <div className="form-section">
                <div className="form-section-title">Informazioni Cliniche</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Modalità</Label>
                    <Select
                      value={newScheda.modalita}
                      onValueChange={(value) =>
                        setNewScheda({ ...newScheda, modalita: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODALITA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivazione</Label>
                    <Select
                      value={newScheda.motivazione}
                      onValueChange={(value) =>
                        setNewScheda({ ...newScheda, motivazione: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIVAZIONE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Operatore</Label>
                  <Input
                    value={newScheda.operatore}
                    onChange={(e) =>
                      setNewScheda({ ...newScheda, operatore: e.target.value })
                    }
                    placeholder="Nome operatore"
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Note</Label>
                  <Textarea
                    value={newScheda.note}
                    onChange={(e) =>
                      setNewScheda({ ...newScheda, note: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreate} data-testid="save-scheda-impianto-btn">
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
              Scheda Impianto del {selectedScheda && format(new Date(selectedScheda.data_impianto), "d MMMM yyyy", { locale: it })}
            </DialogTitle>
          </DialogHeader>

          {selectedScheda && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tipo Catetere</Label>
                    <p>{TIPO_CATETERE_OPTIONS.find((t) => t.id === selectedScheda.tipo_catetere)?.label || selectedScheda.tipo_catetere}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sede</Label>
                    <p>{selectedScheda.sede || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Braccio</Label>
                    <p>{selectedScheda.braccio === "dx" ? "Destro" : selectedScheda.braccio === "sn" ? "Sinistro" : "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vena</Label>
                    <p>{VENA_OPTIONS.find((v) => v.id === selectedScheda.vena)?.label || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Exit-site</Label>
                    <p>{selectedScheda.exit_site_cm ? `${selectedScheda.exit_site_cm} cm` : "-"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Caratteristiche</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedScheda.ecoguidato && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Ecoguidato</span>}
                    {selectedScheda.precauzioni_barriera && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Precauzioni barriera</span>}
                    {selectedScheda.sutureless_device && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Sutureless device</span>}
                    {selectedScheda.medicazione_trasparente && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Medicazione trasparente</span>}
                    {selectedScheda.controllo_rx && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Controllo RX</span>}
                    {selectedScheda.controllo_ecg && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Controllo ECG</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Modalità</Label>
                    <p>{MODALITA_OPTIONS.find((m) => m.id === selectedScheda.modalita)?.label || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Motivazione</Label>
                    <p>{MOTIVAZIONE_OPTIONS.find((m) => m.id === selectedScheda.motivazione)?.label || "-"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Operatore</Label>
                  <p>{selectedScheda.operatore || "-"}</p>
                </div>
                {selectedScheda.note && (
                  <div>
                    <Label className="text-muted-foreground">Note</Label>
                    <p className="whitespace-pre-wrap">{selectedScheda.note}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedaImpiantoPICC;
