import { useState, useEffect, useCallback } from "react";
import { useAmbulatorio, apiClient } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Calendar,
  Bandage,
  Syringe,
  Droplets,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  { value: 1, label: "Gennaio" },
  { value: 2, label: "Febbraio" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Aprile" },
  { value: 5, label: "Maggio" },
  { value: 6, label: "Giugno" },
  { value: 7, label: "Luglio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Settembre" },
  { value: 10, label: "Ottobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Dicembre" },
];

const PRESTAZIONI_LABELS = {
  medicazione_semplice: { label: "Medicazione semplice", icon: Bandage },
  irrigazione_catetere: { label: "Irrigazione catetere", icon: Droplets },
  fasciatura_semplice: { label: "Fasciatura semplice", icon: CircleDot },
  iniezione_terapeutica: { label: "Iniezione terapeutica", icon: Syringe },
  catetere_vescicale: { label: "Catetere vescicale", icon: Droplets },
};

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

export default function StatistichePage() {
  const { ambulatorio } = useAmbulatorio();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [implantStats, setImplantStats] = useState(null);
  const [compareStats, setCompareStats] = useState(null);
  const [activeTab, setActiveTab] = useState(
    ambulatorio === "villa_ginestre" ? "PICC" : "MED"
  );

  // Filters
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [mese, setMese] = useState(null);

  // Compare filters
  const [compareMode, setCompareMode] = useState(false);
  const [compareAnno, setCompareAnno] = useState(new Date().getFullYear());
  const [compareMese, setCompareMese] = useState(null);

  const isVillaGinestre = ambulatorio === "villa_ginestre";

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "IMPIANTI") {
        // Fetch implant statistics
        const params = { ambulatorio, anno };
        if (mese) params.mese = mese;
        
        const response = await apiClient.get("/statistics/implants", { params });
        setImplantStats(response.data);
        setStats(null);
      } else {
        // Fetch regular statistics
        const params = {
          ambulatorio,
          anno,
          tipo: isVillaGinestre ? "PICC" : activeTab,
        };
        if (mese) params.mese = mese;

        const response = await apiClient.get("/statistics", { params });
        setStats(response.data);
        setImplantStats(null);

        if (compareMode) {
          const compareParams = {
            ambulatorio,
            anno: compareAnno,
            tipo: isVillaGinestre ? "PICC" : activeTab,
          };
          if (compareMese) compareParams.mese = compareMese;

          const compareResponse = await apiClient.get("/statistics", { params: compareParams });
          setCompareStats(compareResponse.data);
        } else {
          setCompareStats(null);
        }
      }
    } catch (error) {
      toast.error("Errore nel caricamento delle statistiche");
    } finally {
      setLoading(false);
    }
  }, [ambulatorio, anno, mese, activeTab, compareMode, compareAnno, compareMese, isVillaGinestre]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const generateExcel = () => {
    if (!stats) return;

    const tipo = isVillaGinestre ? "PICC" : activeTab;
    const periodo = mese ? `${MONTHS[mese - 1]?.label}_${anno}` : `Anno_${anno}`;
    
    // Create CSV content
    let csvContent = "REPORT AMBULATORIO INFERMIERISTICO\n";
    csvContent += `Tipo: ${tipo}\n`;
    csvContent += `Periodo: ${periodo}\n`;
    csvContent += `Ambulatorio: ${ambulatorio === "pta_centro" ? "PTA Centro" : "Villa delle Ginestre"}\n\n`;
    
    csvContent += "RIEPILOGO GENERALE\n";
    csvContent += `Totale Accessi;${stats.totale_accessi}\n`;
    csvContent += `Pazienti Unici;${stats.pazienti_unici}\n\n`;
    
    csvContent += "DETTAGLIO PRESTAZIONI\n";
    csvContent += "Prestazione;Quantità\n";
    Object.entries(stats.prestazioni || {}).forEach(([key, value]) => {
      const label = PRESTAZIONI_LABELS[key]?.label || key;
      csvContent += `${label};${value}\n`;
    });
    
    if (stats.dettaglio_mensile && Object.keys(stats.dettaglio_mensile).length > 0) {
      csvContent += "\nDETTAGLIO MENSILE\n";
      csvContent += "Mese;Accessi;Pazienti Unici;";
      
      const allPrestazioni = new Set();
      Object.values(stats.dettaglio_mensile).forEach(data => {
        Object.keys(data.prestazioni || {}).forEach(p => allPrestazioni.add(p));
      });
      
      allPrestazioni.forEach(p => {
        csvContent += `${PRESTAZIONI_LABELS[p]?.label || p};`;
      });
      csvContent += "\n";
      
      Object.entries(stats.dettaglio_mensile)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, data]) => {
          const [year, monthNum] = month.split("-");
          const monthName = MONTHS[parseInt(monthNum) - 1]?.label || month;
          csvContent += `${monthName} ${year};${data.accessi};${data.pazienti_unici};`;
          allPrestazioni.forEach(p => {
            csvContent += `${data.prestazioni?.[p] || 0};`;
          });
          csvContent += "\n";
        });
    }

    // Download
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${tipo}_${periodo}.csv`;
    link.click();
    toast.success("Report Excel (CSV) scaricato");
  };

  const generatePDF = () => {
    if (!stats) return;

    const tipo = isVillaGinestre ? "PICC" : activeTab;
    const periodo = mese ? `${MONTHS[mese - 1]?.label} ${anno}` : `Anno ${anno}`;
    const ambulatorioName = ambulatorio === "pta_centro" ? "PTA Centro" : "Villa delle Ginestre";

    // Create printable HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report ${tipo} - ${periodo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a365d; }
          h1 { color: #1a56db; border-bottom: 3px solid #1a56db; padding-bottom: 10px; }
          h2 { color: #1e40af; margin-top: 30px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { background: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: #fff; border: 2px solid #1a56db; border-radius: 8px; padding: 20px; text-align: center; }
          .stat-value { font-size: 36px; font-weight: bold; color: #1a56db; }
          .stat-label { color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1a56db; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 REPORT AMBULATORIO INFERMIERISTICO</h1>
          <p style="font-size: 18px; color: #64748b;">Statistiche ${tipo}</p>
        </div>
        
        <div class="info">
          <p><strong>Ambulatorio:</strong> ${ambulatorioName}</p>
          <p><strong>Periodo:</strong> ${periodo}</p>
          <p><strong>Tipologia:</strong> ${tipo}</p>
          <p><strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
        </div>

        <h2>📈 Riepilogo Generale</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totale_accessi}</div>
            <div class="stat-label">Totale Accessi</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.pazienti_unici}</div>
            <div class="stat-label">Pazienti Unici</div>
          </div>
        </div>

        <h2>💉 Dettaglio Prestazioni</h2>
        <table>
          <thead>
            <tr>
              <th>Prestazione</th>
              <th>Quantità</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(stats.prestazioni || {}).map(([key, value]) => `
              <tr>
                <td>${PRESTAZIONI_LABELS[key]?.label || key}</td>
                <td><strong>${value}</strong></td>
              </tr>
            `).join('')}
            ${Object.keys(stats.prestazioni || {}).length === 0 ? '<tr><td colspan="2" style="text-align:center;color:#64748b;">Nessuna prestazione registrata</td></tr>' : ''}
          </tbody>
        </table>

        ${stats.dettaglio_mensile && Object.keys(stats.dettaglio_mensile).length > 0 ? `
          <h2>📅 Dettaglio Mensile</h2>
          <table>
            <thead>
              <tr>
                <th>Mese</th>
                <th>Accessi</th>
                <th>Pazienti</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(stats.dettaglio_mensile)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, data]) => {
                  const [year, monthNum] = month.split("-");
                  const monthName = MONTHS[parseInt(monthNum) - 1]?.label || month;
                  return `
                    <tr>
                      <td>${monthName} ${year}</td>
                      <td>${data.accessi}</td>
                      <td>${data.pazienti_unici}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <p>Ambulatorio Infermieristico - ASP Palermo</p>
          <p>Report generato automaticamente</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    toast.success("Report PDF aperto per la stampa");
  };

  const getDiff = (current, previous) => {
    if (!previous) return null;
    return current - previous;
  };

  const DiffBadge = ({ diff }) => {
    if (diff === null || diff === undefined) return null;
    if (diff === 0) {
      return (
        <span className="stat-change flex items-center gap-1">
          <Minus className="w-3 h-3" />
          Invariato
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="stat-change positive flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          +{diff}
        </span>
      );
    }
    return (
      <span className="stat-change negative flex items-center gap-1">
        <TrendingDown className="w-3 h-3" />
        {diff}
      </span>
    );
  };

  const StatCard = ({ title, value, compareValue, icon: Icon }) => {
    const diff = compareMode && compareStats ? getDiff(value, compareValue) : null;
    return (
      <Card className="stat-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="stat-value">{value || 0}</p>
            <p className="stat-label">{title}</p>
            {compareMode && <DiffBadge diff={diff} />}
          </div>
          {Icon && (
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="statistiche-page">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiche</h1>
          <p className="text-muted-foreground text-sm">
            Report e analisi delle prestazioni
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePDF} data-testid="export-pdf-btn">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={generateExcel} data-testid="export-excel-btn">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Anno</Label>
              <Select value={anno.toString()} onValueChange={(v) => setAnno(parseInt(v))}>
                <SelectTrigger data-testid="stats-anno-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mese</Label>
              <Select
                value={mese?.toString() || "all"}
                onValueChange={(v) => setMese(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger data-testid="stats-mese-select">
                  <SelectValue placeholder="Tutti i mesi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i mesi</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Confronta</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                <Checkbox
                  id="compareMode"
                  checked={compareMode}
                  onCheckedChange={setCompareMode}
                />
                <label htmlFor="compareMode" className="text-sm cursor-pointer">
                  Abilita confronto
                </label>
              </div>
            </div>

            {compareMode && (
              <>
                <div className="space-y-2">
                  <Label>Anno confronto</Label>
                  <Select
                    value={compareAnno.toString()}
                    onValueChange={(v) => setCompareAnno(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mese confronto</Label>
                  <Select
                    value={compareMese?.toString() || "all"}
                    onValueChange={(v) => setCompareMese(v === "all" ? null : parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti i mesi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i mesi</SelectItem>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          {!isVillaGinestre && (
            <TabsTrigger value="MED" data-testid="stats-tab-med">
              Statistiche MED
            </TabsTrigger>
          )}
          <TabsTrigger value="PICC" data-testid="stats-tab-picc">
            Statistiche PICC
          </TabsTrigger>
          <TabsTrigger value="IMPIANTI" data-testid="stats-tab-impianti">
            Statistiche Impianti
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Totale Accessi"
          value={stats?.totale_accessi}
          compareValue={compareStats?.totale_accessi}
          icon={Calendar}
        />
        <StatCard
          title="Pazienti Unici"
          value={stats?.pazienti_unici}
          compareValue={compareStats?.pazienti_unici}
          icon={Users}
        />
      </div>

      {/* Prestazioni Detail */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Dettaglio Prestazioni</CardTitle>
          <CardDescription>
            Conteggio delle prestazioni per tipologia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.prestazioni && Object.keys(stats.prestazioni).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.prestazioni).map(([key, value]) => {
                const prestInfo = PRESTAZIONI_LABELS[key] || { label: key, icon: Bandage };
                const Icon = prestInfo.icon;
                const compareValue = compareStats?.prestazioni?.[key] || 0;
                const diff = compareMode ? getDiff(value, compareValue) : null;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">{prestInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-primary">{value}</span>
                      {compareMode && <DiffBadge diff={diff} />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna prestazione registrata per il periodo selezionato</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      {stats?.dettaglio_mensile && Object.keys(stats.dettaglio_mensile).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dettaglio Mensile</CardTitle>
            <CardDescription>
              Riepilogo mese per mese
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {Object.entries(stats.dettaglio_mensile)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, data]) => {
                    const [year, monthNum] = month.split("-");
                    const monthName = MONTHS[parseInt(monthNum) - 1]?.label || month;

                    return (
                      <Card key={month} className="border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {monthName} {year}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-2xl font-bold text-primary">
                                {data.accessi}
                              </p>
                              <p className="text-xs text-muted-foreground">Accessi</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-primary">
                                {data.pazienti_unici}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Pazienti Unici
                              </p>
                            </div>
                          </div>

                          {data.prestazioni && Object.keys(data.prestazioni).length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium mb-2">Prestazioni:</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(data.prestazioni).map(([prest, count]) => {
                                  const prestInfo = PRESTAZIONI_LABELS[prest] || { label: prest };
                                  return (
                                    <span
                                      key={prest}
                                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                                    >
                                      {prestInfo.label}: {count}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Compare Info */}
      {compareMode && compareStats && (
        <Card className="mt-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Confronto Attivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Stai confrontando{" "}
              <strong>
                {mese ? MONTHS[mese - 1]?.label : "Anno"} {anno}
              </strong>{" "}
              con{" "}
              <strong>
                {compareMese ? MONTHS[compareMese - 1]?.label : "Anno"} {compareAnno}
              </strong>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Periodo Principale</p>
                <p className="font-bold">{stats?.totale_accessi || 0} accessi</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Periodo Confronto</p>
                <p className="font-bold">{compareStats?.totale_accessi || 0} accessi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
