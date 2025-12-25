import { useNavigate } from "react-router-dom";
import { useAmbulatorio } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, FileText, BarChart3 } from "lucide-react";

const DASHBOARD_ITEMS = [
  {
    id: "agenda",
    title: "Agenda",
    description: "Gestisci appuntamenti e prenotazioni",
    icon: Calendar,
    path: "/agenda",
    color: "agenda",
  },
  {
    id: "pazienti",
    title: "Pazienti",
    description: "Cartelle cliniche e anagrafica",
    icon: Users,
    path: "/pazienti",
    color: "pazienti",
  },
  {
    id: "modulistica",
    title: "Modulistica",
    description: "Moduli e documenti scaricabili",
    icon: FileText,
    path: "/modulistica",
    color: "modulistica",
  },
  {
    id: "statistiche",
    title: "Statistiche",
    description: "Report e analisi dati",
    icon: BarChart3,
    path: "/statistiche",
    color: "statistiche",
  },
];

const AMBULATORI_NAMES = {
  pta_centro: "PTA Centro",
  villa_ginestre: "Villa delle Ginestre",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { ambulatorio } = useAmbulatorio();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {AMBULATORI_NAMES[ambulatorio]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Seleziona una sezione per iniziare
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {DASHBOARD_ITEMS.map((item) => (
          <Card
            key={item.id}
            data-testid={`dashboard-${item.id}-btn`}
            className="dashboard-card group"
            onClick={() => navigate(item.path)}
          >
            <CardHeader className="pb-2">
              <div className={`dashboard-card-icon ${item.color}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {item.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {ambulatorio === "villa_ginestre" && (
        <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800">
            <strong>Nota:</strong> Villa delle Ginestre gestisce esclusivamente pazienti PICC.
            Le sezioni MED non sono disponibili in questo ambulatorio.
          </p>
        </div>
      )}
    </div>
  );
}
