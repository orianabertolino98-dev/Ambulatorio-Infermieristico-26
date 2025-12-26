import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAmbulatorio, apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  ChevronRight,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Filter,
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
  const [allPatients, setAllPatients] = useState({ in_cura: [], dimesso: [], sospeso: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("in_cura");
  const [typeFilter, setTypeFilter] = useState("all"); // "all", "PICC", "MED", "PICC_MED"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPatientForStatus, setSelectedPatientForStatus] = useState(null);
  const [selectedPatientForDelete, setSelectedPatientForDelete] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [newPatient, setNewPatient] = useState({
    nome: "",
    cognome: "",
    tipo: "",
  });

  const isVillaGinestre = ambulatorio === "villa_ginestre";
  const availableTypes = isVillaGinestre 
    ? PATIENT_TYPES.filter(t => t.value === "PICC")
    : PATIENT_TYPES;

  const fetchAllPatients = useCallback(async () => {
    setLoading(true);
    try {
      const [inCuraRes, dimessiRes, sospesiRes] = await Promise.all([
        apiClient.get("/patients", { params: { ambulatorio, status: "in_cura" } }),
        apiClient.get("/patients", { params: { ambulatorio, status: "dimesso" } }),
        apiClient.get("/patients", { params: { ambulatorio, status: "sospeso" } }),
      ]);
      
      setAllPatients({
        in_cura: inCuraRes.data,
        dimesso: dimessiRes.data,
        sospeso: sospesiRes.data,
      });
    } catch (error) {
      toast.error("Errore nel caricamento dei pazienti");
    } finally {
      setLoading(false);
    }
  }, [ambulatorio]);

  useEffect(() => {
    fetchAllPatients();
  }, [fetchAllPatients]);

  // Filter patients based on active tab, search, and type filter
  const filteredPatients = allPatients[activeTab]?.filter(p => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!p.nome?.toLowerCase().includes(query) && !p.cognome?.toLowerCase().includes(query)) {
        return false;
      }
    }
    // Type filter
    if (typeFilter !== "all") {
      if (typeFilter === "PICC" && p.tipo !== "PICC" && p.tipo !== "PICC_MED") return false;
      if (typeFilter === "MED" && p.tipo !== "MED" && p.tipo !== "PICC_MED") return false;
      if (typeFilter === "PICC_MED" && p.tipo !== "PICC_MED") return false;
    }
    return true;
  }) || [];

  // Get counts for badges
  const getCounts = () => ({
    in_cura: allPatients.in_cura?.length || 0,
    dimesso: allPatients.dimesso?.length || 0,
    sospeso: allPatients.sospeso?.length || 0,
    picc_in_cura: allPatients.in_cura?.filter(p => p.tipo === "PICC" || p.tipo === "PICC_MED").length || 0,
    med_in_cura: allPatients.in_cura?.filter(p => p.tipo === "MED" || p.tipo === "PICC_MED").length || 0,
  });

  const counts = getCounts();

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
      fetchAllPatients();
      navigate(`/pazienti/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione");
    }
  };

  const openStatusDialog = (patient, targetStatus, e) => {
    e.stopPropagation();
    setSelectedPatientForStatus(patient);
    setNewStatus(targetStatus);
    setStatusReason("");
    setStatusNotes("");
    setStatusDialogOpen(true);
  };

  const openDeleteDialog = (patient, e) => {
    e.stopPropagation();
    setSelectedPatientForDelete(patient);
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = async () => {
    if (!selectedPatientForStatus) return;
    
    // Validation
    if (newStatus === "dimesso" && !statusReason) {
      toast.error("Seleziona una motivazione per la dimissione");
      return;
    }
    if (newStatus === "sospeso" && !statusNotes) {
      toast.error("Inserisci una nota per la sospensione");
      return;
    }
    if (newStatus === "dimesso" && statusReason === "altro" && !statusNotes) {
      toast.error("Inserisci una nota per specificare il motivo");
      return;
    }

    try {
      const updateData = { status: newStatus };
      
      if (newStatus === "dimesso") {
        updateData.discharge_reason = statusReason;
        updateData.discharge_notes = statusNotes;
      } else if (newStatus === "sospeso") {
        updateData.suspend_notes = statusNotes;
      }

      await apiClient.put(`/patients/${selectedPatientForStatus.id}`, updateData);
      
      const statusLabels = {
        in_cura: "ripreso in cura",
        dimesso: "dimesso",
        sospeso: "sospeso",
      };
      
      toast.success(`Paziente ${statusLabels[newStatus]}`);
      setStatusDialogOpen(false);
      fetchAllPatients();
    } catch (error) {
      toast.error("Errore nel cambio stato");
    }
  };

  const handleDeletePatient = async () => {
    if (!selectedPatientForDelete) return;
    
    try {
      await apiClient.delete(`/patients/${selectedPatientForDelete.id}`);
      toast.success("Paziente eliminato definitivamente");
      setDeleteDialogOpen(false);
      setSelectedPatientForDelete(null);
      fetchAllPatients();
    } catch (error) {
      toast.error("Errore nell'eliminazione del paziente");
    }
  };

  const getTypeColor = (tipo) => {
    const type = PATIENT_TYPES.find(t => t.value === tipo);
    return type?.color || "bg-gray-100 text-gray-700";
  };

  const getInitials = (nome, cognome) => {
    return `${cognome?.charAt(0) || ""}${nome?.charAt(0) || ""}`.toUpperCase();
  };

  const getStatusActions = (patient) => {
    const currentStatus = patient.status;
    const actions = [];
    
    if (currentStatus !== "in_cura") {
      actions.push({
        label: "Riprendi in Cura",
        icon: Play,
        status: "in_cura",
        color: "text-green-600",
      });
    }
    if (currentStatus !== "sospeso") {
      actions.push({
        label: "Sospendi",
        icon: Pause,
        status: "sospeso",
        color: "text-orange-600",
      });
    }
    if (currentStatus !== "dimesso") {
      actions.push({
        label: "Dimetti",
        icon: UserX,
        status: "dimesso",
        color: "text-slate-600",
      });
    }
    
    return actions;
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

      {/* Patient Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`border-emerald-200 cursor-pointer transition-all ${typeFilter === "PICC" ? "bg-emerald-100 ring-2 ring-emerald-500" : "bg-emerald-50/50 hover:bg-emerald-100/50"}`}
          onClick={() => setTypeFilter(typeFilter === "PICC" ? "all" : "PICC")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-emerald-600">
              {counts.picc_in_cura}
            </div>
            <p className="text-sm text-emerald-600/80 font-medium">PICC in cura</p>
          </CardContent>
        </Card>
        {!isVillaGinestre && (
          <Card 
            className={`border-blue-200 cursor-pointer transition-all ${typeFilter === "MED" ? "bg-blue-100 ring-2 ring-blue-500" : "bg-blue-50/50 hover:bg-blue-100/50"}`}
            onClick={() => setTypeFilter(typeFilter === "MED" ? "all" : "MED")}
          >
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-2xl font-bold text-blue-600">
                {counts.med_in_cura}
              </div>
              <p className="text-sm text-blue-600/80 font-medium">MED in cura</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-green-600">{counts.in_cura}</div>
            <p className="text-sm text-green-600/80 font-medium">Totale in cura</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-gray-600">{counts.dimesso + counts.sospeso}</div>
            <p className="text-sm text-gray-600/80 font-medium">Dimessi/Sospesi</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="patient-search-input"
            placeholder="Cerca per nome o cognome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {!isVillaGinestre && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtra per tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="PICC">Solo PICC</SelectItem>
              <SelectItem value="MED">Solo MED</SelectItem>
              <SelectItem value="PICC_MED">Solo PICC+MED</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="in_cura" className="gap-2" data-testid="tab-in-cura">
            <Users className="w-4 h-4" />
            In Cura
            <Badge variant="secondary" className="ml-1">{counts.in_cura}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sospeso" className="gap-2" data-testid="tab-sospeso">
            <Pause className="w-4 h-4" />
            Sospesi
            <Badge variant="secondary" className="ml-1">{counts.sospeso}</Badge>
          </TabsTrigger>
          <TabsTrigger value="dimesso" className="gap-2" data-testid="tab-dimesso">
            <UserCheck className="w-4 h-4" />
            Dimessi
            <Badge variant="secondary" className="ml-1">{counts.dimesso}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {typeFilter !== "all" 
                    ? `Nessun paziente ${typeFilter} trovato` 
                    : "Nessun paziente trovato"}
                </p>
                {activeTab === "in_cura" && typeFilter === "all" && (
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
              {filteredPatients.map((patient) => (
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
                    <div className="flex items-center gap-2">
                      <Badge className={`patient-type ${getTypeColor(patient.tipo)}`}>
                        {patient.tipo === "PICC_MED" ? "PICC + MED" : patient.tipo}
                      </Badge>
                      {patient.discharge_reason && activeTab === "dimesso" && (
                        <span className="text-xs text-muted-foreground">
                          ({patient.discharge_reason === "guarito" ? "Guarito" : 
                            patient.discharge_reason === "adi" ? "ADI" : "Altro"})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {getStatusActions(patient).map((action) => (
                        <DropdownMenuItem
                          key={action.status}
                          onClick={(e) => openStatusDialog(patient, action.status, e)}
                          className={action.color}
                        >
                          <action.icon className="w-4 h-4 mr-2" />
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pazienti/${patient.id}`);
                        }}
                      >
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Apri Cartella
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => openDeleteDialog(patient, e)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina Definitivamente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
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

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newStatus === "in_cura" && "Riprendi in Cura"}
              {newStatus === "dimesso" && "Dimetti Paziente"}
              {newStatus === "sospeso" && "Sospendi Paziente"}
            </DialogTitle>
            <DialogDescription>
              {selectedPatientForStatus && (
                <span className="font-medium">
                  {selectedPatientForStatus.cognome} {selectedPatientForStatus.nome}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {newStatus === "in_cura" && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Il paziente verrà riportato in stato &quot;In Cura&quot;. Lo storico delle dimissioni/sospensioni precedenti verrà conservato.
                </p>
              </div>
            )}

            {newStatus === "dimesso" && (
              <div className="space-y-2">
                <Label>Motivazione *</Label>
                <Select value={statusReason} onValueChange={setStatusReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona motivazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guarito">Guarito</SelectItem>
                    <SelectItem value="adi">ADI</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(newStatus === "sospeso" || (newStatus === "dimesso" && statusReason === "altro")) && (
              <div className="space-y-2">
                <Label>
                  Note {newStatus === "sospeso" ? "*" : "(opzionale)"}
                </Label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder={
                    newStatus === "sospeso"
                      ? "Es: Ricovero ospedaliero, Vacanza, ecc."
                      : "Specifica il motivo della dimissione..."
                  }
                  rows={3}
                />
              </div>
            )}

            {newStatus === "dimesso" && statusReason && statusReason !== "altro" && (
              <div className="space-y-2">
                <Label>Note (opzionale)</Label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Note aggiuntive..."
                  rows={2}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleStatusChange}>
                Conferma
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo paziente?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPatientForDelete && (
                <>
                  Stai per eliminare definitivamente <strong>{selectedPatientForDelete.cognome} {selectedPatientForDelete.nome}</strong>.
                  <br /><br />
                  Questa azione non può essere annullata. Tutti i dati del paziente (cartella clinica, schede medicazione, foto) verranno eliminati permanentemente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePatient} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
