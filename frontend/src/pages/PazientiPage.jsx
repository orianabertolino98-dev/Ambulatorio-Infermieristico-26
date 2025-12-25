import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAmbulatorio, apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const PATIENT_TYPES = [
  { value: "PICC", label: "PICC", color: "bg-emerald-100 text-emerald-700" },
  { value: "MED", label: "MED", color: "bg-blue-100 text-blue-700" },
  { value: "PICC_MED", label: "PICC + MED", color: "bg-purple-100 text-purple-700" },
];

export default function PazientiPage() {
  const { ambulatorio } = useAmbulatorio();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("in_cura");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    nome: "",
    cognome: "",
    tipo: "",
  });

  const isVillaGinestre = ambulatorio === "villa_ginestre";
  const availableTypes = isVillaGinestre 
    ? PATIENT_TYPES.filter(t => t.value === "PICC")
    : PATIENT_TYPES;

  const fetchPatients = useCallback(async () => {
    try {
      const response = await apiClient.get("/patients", {
        params: {
          ambulatorio,
          status: activeTab,
          search: searchQuery || undefined,
        },
      });
      setPatients(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei pazienti");
    } finally {
      setLoading(false);
    }
  }, [ambulatorio, activeTab, searchQuery]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleCreatePatient = async () => {
    if (!newPatient.nome || !newPatient.cognome || !newPatient.tipo) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    try {
      const response = await apiClient.post("/patients", {
        ...newPatient,
        ambulatorio,
      });
      toast.success("Paziente creato con successo");
      setDialogOpen(false);
      setNewPatient({ nome: "", cognome: "", tipo: "" });
      fetchPatients();
      // Navigate to patient detail
      navigate(`/pazienti/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione");
    }
  };

  const getTypeColor = (tipo) => {
    const type = PATIENT_TYPES.find(t => t.value === tipo);
    return type?.color || "bg-gray-100 text-gray-700";
  };

  const getInitials = (nome, cognome) => {
    return `${cognome?.charAt(0) || ""}${nome?.charAt(0) || ""}`.toUpperCase();
  };

  const getCounts = () => {
    return {
      in_cura: patients.filter(p => p.status === "in_cura").length,
      dimesso: patients.filter(p => p.status === "dimesso").length,
      sospeso: patients.filter(p => p.status === "sospeso").length,
    };
  };

  return (
    <div className="animate-fade-in" data-testid="pazienti-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pazienti</h1>
          <p className="text-muted-foreground text-sm">
            Gestione cartelle cliniche
          </p>
        </div>

        <Button onClick={() => setDialogOpen(true)} data-testid="create-patient-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Paziente
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="patient-search-input"
          placeholder="Cerca per nome o cognome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="in_cura" className="gap-2" data-testid="tab-in-cura">
            <Users className="w-4 h-4" />
            In Cura
          </TabsTrigger>
          <TabsTrigger value="dimesso" className="gap-2" data-testid="tab-dimesso">
            <UserCheck className="w-4 h-4" />
            Dimessi
          </TabsTrigger>
          <TabsTrigger value="sospeso" className="gap-2" data-testid="tab-sospeso">
            <UserX className="w-4 h-4" />
            Sospesi
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : patients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nessun paziente trovato</p>
                {activeTab === "in_cura" && (
                  <Button
                    variant="link"
                    onClick={() => setDialogOpen(true)}
                    className="mt-2"
                  >
                    Crea il primo paziente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {patients.map((patient) => (
                <Card
                  key={patient.id}
                  data-testid={`patient-card-${patient.id}`}
                  className="patient-card cursor-pointer hover:border-primary/50"
                  onClick={() => navigate(`/pazienti/${patient.id}`)}
                >
                  <div className="patient-avatar">
                    {getInitials(patient.nome, patient.cognome)}
                  </div>
                  <div className="patient-info">
                    <div className="patient-name">
                      {patient.cognome} {patient.nome}
                    </div>
                    <Badge className={`patient-type ${getTypeColor(patient.tipo)}`}>
                      {patient.tipo === "PICC_MED" ? "PICC + MED" : patient.tipo}
                    </Badge>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Patient Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Paziente</DialogTitle>
            <DialogDescription>
              Inserisci i dati del nuovo paziente per creare la cartella clinica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cognome">Cognome *</Label>
                <Input
                  id="cognome"
                  data-testid="new-patient-cognome"
                  placeholder="Cognome"
                  value={newPatient.cognome}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, cognome: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  data-testid="new-patient-nome"
                  placeholder="Nome"
                  value={newPatient.nome}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, nome: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipologia *</Label>
              <Select
                value={newPatient.tipo}
                onValueChange={(value) =>
                  setNewPatient({ ...newPatient, tipo: value })
                }
              >
                <SelectTrigger data-testid="new-patient-tipo">
                  <SelectValue placeholder="Seleziona tipologia" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={handleCreatePatient}
                data-testid="confirm-create-patient-btn"
              >
                Crea e Apri Cartella
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
