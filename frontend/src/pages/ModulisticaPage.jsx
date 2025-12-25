import { useState, useEffect, useCallback } from "react";
import { useAmbulatorio, apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function ModulisticaPage() {
  const { ambulatorio } = useAmbulatorio();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    ambulatorio === "villa_ginestre" ? "PICC" : "MED"
  );

  const isVillaGinestre = ambulatorio === "villa_ginestre";

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await apiClient.get("/documents", {
        params: { ambulatorio },
      });
      setDocuments(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei documenti");
    } finally {
      setLoading(false);
    }
  }, [ambulatorio]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = (doc) => {
    window.open(doc.url, "_blank");
    toast.success(`Download ${doc.nome} avviato`);
  };

  const filteredDocs = documents.filter((d) => d.categoria === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="modulistica-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Modulistica</h1>
        <p className="text-muted-foreground text-sm">
          Moduli e documenti scaricabili e stampabili
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {!isVillaGinestre && (
          <TabsList className="mb-6">
            <TabsTrigger value="MED" data-testid="tab-modulistica-med">
              Moduli MED
            </TabsTrigger>
            <TabsTrigger value="PICC" data-testid="tab-modulistica-picc">
              Moduli PICC
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value={activeTab}>
          {filteredDocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nessun documento disponibile</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="document-item flex-col">
                  <div className="flex items-start gap-4 w-full">
                    <div
                      className={`document-icon ${
                        doc.tipo_file === "pdf" ? "pdf" : "word"
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1 line-clamp-2">
                        {doc.nome}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {doc.tipo_file.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(doc)}
                      data-testid={`download-${doc.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Scarica
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Informazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              I documenti PDF possono essere visualizzati, stampati e salvati
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              Per compilare i moduli, scaricali e aprili con il tuo lettore PDF o Word
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              I moduli compilati possono essere associati alla cartella clinica del paziente
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
