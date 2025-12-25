from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, date, timedelta
import jwt
import bcrypt
from enum import Enum
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'ambulatorio-infermieristico-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Create the main app
app = FastAPI(title="Ambulatorio Infermieristico API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== ENUMS ==============
class PatientType(str, Enum):
    PICC = "PICC"
    MED = "MED"
    PICC_MED = "PICC_MED"

class PatientStatus(str, Enum):
    IN_CURA = "in_cura"
    DIMESSO = "dimesso"
    SOSPESO = "sospeso"

class DischargeReason(str, Enum):
    GUARITO = "guarito"
    ADI = "adi"
    ALTRO = "altro"

class Ambulatorio(str, Enum):
    PTA_CENTRO = "pta_centro"
    VILLA_GINESTRE = "villa_ginestre"

# ============== MODELS ==============
class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    ambulatori: List[str]

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PatientCreate(BaseModel):
    nome: str
    cognome: str
    tipo: PatientType
    ambulatorio: Ambulatorio
    data_nascita: Optional[str] = None
    codice_fiscale: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    medico_base: Optional[str] = None
    anamnesi: Optional[str] = None
    terapia_in_atto: Optional[str] = None
    allergie: Optional[str] = None

class PatientUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    tipo: Optional[PatientType] = None
    data_nascita: Optional[str] = None
    codice_fiscale: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    medico_base: Optional[str] = None
    anamnesi: Optional[str] = None
    terapia_in_atto: Optional[str] = None
    allergie: Optional[str] = None
    status: Optional[PatientStatus] = None
    discharge_reason: Optional[str] = None
    discharge_notes: Optional[str] = None
    suspend_notes: Optional[str] = None
    lesion_markers: Optional[List[Dict[str, Any]]] = None

class Patient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cognome: str
    tipo: PatientType
    ambulatorio: Ambulatorio
    status: PatientStatus = PatientStatus.IN_CURA
    data_nascita: Optional[str] = None
    codice_fiscale: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    medico_base: Optional[str] = None
    anamnesi: Optional[str] = None
    terapia_in_atto: Optional[str] = None
    allergie: Optional[str] = None
    lesion_markers: List[Dict[str, Any]] = []
    discharge_reason: Optional[str] = None
    discharge_notes: Optional[str] = None
    suspend_notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Prestazioni
class PrestazionePICC(str, Enum):
    MEDICAZIONE_SEMPLICE = "medicazione_semplice"
    IRRIGAZIONE_CATETERE = "irrigazione_catetere"

class PrestazioneMED(str, Enum):
    MEDICAZIONE_SEMPLICE = "medicazione_semplice"
    FASCIATURA_SEMPLICE = "fasciatura_semplice"
    INIEZIONE_TERAPEUTICA = "iniezione_terapeutica"
    CATETERE_VESCICALE = "catetere_vescicale"

class AppointmentCreate(BaseModel):
    patient_id: str
    ambulatorio: Ambulatorio
    data: str  # YYYY-MM-DD
    ora: str   # HH:MM
    tipo: str  # PICC or MED
    prestazioni: List[str]
    note: Optional[str] = None

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    patient_nome: Optional[str] = None
    patient_cognome: Optional[str] = None
    ambulatorio: Ambulatorio
    data: str
    ora: str
    tipo: str
    prestazioni: List[str]
    note: Optional[str] = None
    completed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Scheda Medicazione MED
class SchedaMedicazioneMEDCreate(BaseModel):
    patient_id: str
    ambulatorio: Ambulatorio
    data_compilazione: str
    fondo: List[str] = []  # granuleggiante, fibrinoso, necrotico, infetto, biofilmato
    margini: List[str] = []  # attivi, piantati, in_estensione, a_scogliera
    cute_perilesionale: List[str] = []  # integra, secca, arrossata, macerata, ipercheratosica
    essudato_quantita: Optional[str] = None  # assente, moderato, abbondante
    essudato_tipo: List[str] = []  # sieroso, ematico, infetto
    medicazione: str = "La lesione è stata trattata seguendo le 4 fasi del Wound Hygiene:\nDetersione con Prontosan\nDebridement e Riattivazione dei margini\nMedicazione: "
    prossimo_cambio: Optional[str] = None
    firma: Optional[str] = None
    foto_ids: List[str] = []

class SchedaMedicazioneMED(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    ambulatorio: Ambulatorio
    data_compilazione: str
    fondo: List[str] = []
    margini: List[str] = []
    cute_perilesionale: List[str] = []
    essudato_quantita: Optional[str] = None
    essudato_tipo: List[str] = []
    medicazione: str
    prossimo_cambio: Optional[str] = None
    firma: Optional[str] = None
    foto_ids: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Scheda Impianto PICC
class SchedaImpiantoPICCCreate(BaseModel):
    patient_id: str
    ambulatorio: Ambulatorio
    data_impianto: str
    tipo_catetere: str
    sede: str
    braccio: Optional[str] = None  # dx, sn
    vena: Optional[str] = None  # basilica, cefalica, brachiale
    exit_site_cm: Optional[str] = None
    ecoguidato: bool = False
    igiene_mani: Optional[str] = None
    precauzioni_barriera: bool = False
    disinfettante: Optional[str] = None
    sutureless_device: bool = False
    medicazione_trasparente: bool = False
    controllo_rx: bool = False
    controllo_ecg: bool = False
    modalita: Optional[str] = None  # emergenza, urgenza, elezione
    motivazione: Optional[str] = None
    operatore: Optional[str] = None
    note: Optional[str] = None
    allegati: List[str] = []

class SchedaImpiantoPICC(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    ambulatorio: Ambulatorio
    data_impianto: str
    tipo_catetere: str
    sede: str
    braccio: Optional[str] = None
    vena: Optional[str] = None
    exit_site_cm: Optional[str] = None
    ecoguidato: bool = False
    igiene_mani: Optional[str] = None
    precauzioni_barriera: bool = False
    disinfettante: Optional[str] = None
    sutureless_device: bool = False
    medicazione_trasparente: bool = False
    controllo_rx: bool = False
    controllo_ecg: bool = False
    modalita: Optional[str] = None
    motivazione: Optional[str] = None
    operatore: Optional[str] = None
    note: Optional[str] = None
    allegati: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Scheda Gestione Mensile PICC
class SchedaGestionePICCCreate(BaseModel):
    patient_id: str
    ambulatorio: Ambulatorio
    mese: str  # YYYY-MM
    giorni: Dict[str, Dict[str, Any]] = {}  # {1: {lavaggio_mani: true, ...}, 2: {...}}
    note: Optional[str] = None

class SchedaGestionePICC(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    ambulatorio: Ambulatorio
    mese: str
    giorni: Dict[str, Dict[str, Any]] = {}
    note: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Photo
class PhotoCreate(BaseModel):
    patient_id: str
    ambulatorio: Ambulatorio
    tipo: str  # MED or PICC
    descrizione: Optional[str] = None
    data: str

class Photo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    ambulatorio: Ambulatorio
    tipo: str
    descrizione: Optional[str] = None
    data: str
    image_data: str  # Base64
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Document Templates
class DocumentTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    categoria: str  # PICC or MED
    tipo_file: str  # pdf, word
    url: str

# Statistics
class StatisticsQuery(BaseModel):
    ambulatorio: Ambulatorio
    tipo: Optional[str] = None  # PICC, MED or None for all
    anno: int
    mese: Optional[int] = None

# ============== USERS DATA ==============
USERS = {
    "Domenico": {
        "password": "infermiere",
        "ambulatori": ["pta_centro", "villa_ginestre"]
    },
    "Antonella": {
        "password": "infermiere",
        "ambulatori": ["pta_centro", "villa_ginestre"]
    },
    "Giovanna": {
        "password": "infermiere",
        "ambulatori": ["pta_centro"]
    },
    "Oriana": {
        "password": "infermiere",
        "ambulatori": ["pta_centro"]
    },
    "G.Domenico": {
        "password": "infermiere",
        "ambulatori": ["pta_centro"]
    }
}

# Document templates
DOCUMENT_TEMPLATES = [
    # MED Documents
    {"id": "consent_med", "nome": "Consenso Informato MED", "categoria": "MED", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_f548c735-b113-437f-82ec-c0afbf122c8d/artifacts/k3jcaxa4_CONSENSO_INFORMATO.pdf"},
    {"id": "scheda_mmg", "nome": "Scheda MMG", "categoria": "MED", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_f548c735-b113-437f-82ec-c0afbf122c8d/artifacts/8bonfflf_SCHEDA_MMG.pdf"},
    {"id": "anagrafica_med", "nome": "Anagrafica/Anamnesi MED", "categoria": "MED", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_f548c735-b113-437f-82ec-c0afbf122c8d/artifacts/txx60tb0_anagrafica%20med.jpg"},
    {"id": "scheda_medicazione_med", "nome": "Scheda Medicazione MED", "categoria": "MED", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_f548c735-b113-437f-82ec-c0afbf122c8d/artifacts/nzkb51vc_medicazione%20med.jpg"},
    # PICC Documents
    {"id": "consent_picc_1", "nome": "Consenso Generico Processi Clinico-Assistenziali", "categoria": "PICC", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_medhub-38/artifacts/ysusww7f_CONSENSO%20GENERICO%20AI%20PROCESSI%20CLINICO.ASSISTENZIALI%20ORDINARI%201.pdf"},
    {"id": "consent_picc_2", "nome": "Consenso Informato PICC e Midline", "categoria": "PICC", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_medhub-38/artifacts/siz46bgw_CONSENSO%20INFORMATO%20PICC%20E%20MIDLINE.pdf"},
    {"id": "brochure_picc_port", "nome": "Brochure PICC Port", "categoria": "PICC", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_medhub-38/artifacts/cein282q_Picc%20Port.pdf"},
    {"id": "brochure_picc", "nome": "Brochure PICC", "categoria": "PICC", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_medhub-38/artifacts/kk882djy_Picc.pdf"},
    {"id": "scheda_impianto_picc", "nome": "Scheda Impianto e Gestione AV", "categoria": "PICC", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_medhub-38/artifacts/sbw1iws9_Sch%20Impianto%20Gestione%20AV%20NEW.pdf"},
    {"id": "specifiche_impianto_picc", "nome": "Specifiche Impianto", "categoria": "PICC", "tipo_file": "pdf", "url": "https://customer-assets.emergentagent.com/job_medhub-38/artifacts/03keycn2_specifiche%20impianto.pdf"},
]

# Italian holidays for Palermo
def get_holidays(year: int) -> List[str]:
    holidays = [
        f"{year}-01-01",  # Capodanno
        f"{year}-01-06",  # Epifania
        f"{year}-04-25",  # Liberazione
        f"{year}-05-01",  # Festa del Lavoro
        f"{year}-06-02",  # Festa della Repubblica
        f"{year}-07-15",  # Santa Rosalia (Palermo)
        f"{year}-08-15",  # Ferragosto
        f"{year}-11-01",  # Ognissanti
        f"{year}-12-08",  # Immacolata
        f"{year}-12-25",  # Natale
        f"{year}-12-26",  # Santo Stefano
    ]
    # Easter calculation (simplified - would need proper algorithm for accuracy)
    # Adding approximate Easter dates for 2026-2030
    easter_dates = {
        2026: "2026-04-05",
        2027: "2027-03-28",
        2028: "2028-04-16",
        2029: "2029-04-01",
        2030: "2030-04-21",
    }
    if year in easter_dates:
        easter = easter_dates[year]
        holidays.append(easter)
        # Pasquetta (Easter Monday)
        easter_date = datetime.strptime(easter, "%Y-%m-%d")
        pasquetta = easter_date + timedelta(days=1)
        holidays.append(pasquetta.strftime("%Y-%m-%d"))
    return holidays

# ============== AUTH HELPERS ==============
def create_token(username: str, ambulatori: List[str]) -> str:
    payload = {
        "sub": username,
        "ambulatori": ambulatori,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

# ============== AUTH ROUTES ==============
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = USERS.get(data.username)
    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(data.username, user["ambulatori"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=data.username.lower().replace(".", "_"),
            username=data.username,
            ambulatori=user["ambulatori"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user(payload: dict = Depends(verify_token)):
    username = payload["sub"]
    user = USERS.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return UserResponse(
        id=username.lower().replace(".", "_"),
        username=username,
        ambulatori=user["ambulatori"]
    )

# ============== PATIENTS ROUTES ==============
@api_router.post("/patients", response_model=Patient, status_code=201)
async def create_patient(data: PatientCreate, payload: dict = Depends(verify_token)):
    # Check ambulatorio access
    if data.ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    # Villa Ginestre only allows PICC
    if data.ambulatorio == Ambulatorio.VILLA_GINESTRE and data.tipo != PatientType.PICC:
        raise HTTPException(status_code=400, detail="Villa delle Ginestre gestisce solo pazienti PICC")
    
    patient = Patient(**data.model_dump())
    doc = patient.model_dump()
    await db.patients.insert_one(doc)
    return patient

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(
    ambulatorio: Ambulatorio,
    status: Optional[PatientStatus] = None,
    tipo: Optional[PatientType] = None,
    search: Optional[str] = None,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    query = {"ambulatorio": ambulatorio.value}
    if status:
        query["status"] = status.value
    if tipo:
        query["tipo"] = tipo.value
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"cognome": {"$regex": search, "$options": "i"}}
        ]
    
    patients = await db.patients.find(query, {"_id": 0}).sort("cognome", 1).to_list(1000)
    return patients

@api_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, payload: dict = Depends(verify_token)):
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    if patient["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    return patient

@api_router.put("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, data: PatientUpdate, payload: dict = Depends(verify_token)):
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    if patient["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    updated = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return updated

@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, payload: dict = Depends(verify_token)):
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    if patient["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    await db.patients.delete_one({"id": patient_id})
    return {"message": "Paziente eliminato"}

# ============== APPOINTMENTS ROUTES ==============
@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(data: AppointmentCreate, payload: dict = Depends(verify_token)):
    if data.ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    # Get patient info
    patient = await db.patients.find_one({"id": data.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    
    # Check slot availability (max 2 per type per slot)
    existing = await db.appointments.count_documents({
        "ambulatorio": data.ambulatorio.value,
        "data": data.data,
        "ora": data.ora,
        "tipo": data.tipo
    })
    if existing >= 2:
        raise HTTPException(status_code=400, detail="Slot pieno (max 2 pazienti)")
    
    appointment = Appointment(
        **data.model_dump(),
        patient_nome=patient["nome"],
        patient_cognome=patient["cognome"]
    )
    doc = appointment.model_dump()
    await db.appointments.insert_one(doc)
    return appointment

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(
    ambulatorio: Ambulatorio,
    data: Optional[str] = None,
    data_from: Optional[str] = None,
    data_to: Optional[str] = None,
    tipo: Optional[str] = None,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    query = {"ambulatorio": ambulatorio.value}
    if data:
        query["data"] = data
    elif data_from and data_to:
        query["data"] = {"$gte": data_from, "$lte": data_to}
    if tipo:
        query["tipo"] = tipo
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort([("data", 1), ("ora", 1)]).to_list(1000)
    return appointments

@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, data: dict, payload: dict = Depends(verify_token)):
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    if appointment["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": data})
    updated = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return updated

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, payload: dict = Depends(verify_token)):
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    if appointment["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    await db.appointments.delete_one({"id": appointment_id})
    return {"message": "Appuntamento eliminato"}

# ============== SCHEDE MEDICAZIONE MED ==============
@api_router.post("/schede-medicazione-med", response_model=SchedaMedicazioneMED)
async def create_scheda_medicazione_med(data: SchedaMedicazioneMEDCreate, payload: dict = Depends(verify_token)):
    if data.ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    scheda = SchedaMedicazioneMED(**data.model_dump())
    doc = scheda.model_dump()
    await db.schede_medicazione_med.insert_one(doc)
    return scheda

@api_router.get("/schede-medicazione-med", response_model=List[SchedaMedicazioneMED])
async def get_schede_medicazione_med(
    patient_id: str,
    ambulatorio: Ambulatorio,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    schede = await db.schede_medicazione_med.find(
        {"patient_id": patient_id, "ambulatorio": ambulatorio.value},
        {"_id": 0}
    ).sort("data_compilazione", -1).to_list(1000)
    return schede

@api_router.get("/schede-medicazione-med/{scheda_id}", response_model=SchedaMedicazioneMED)
async def get_scheda_medicazione_med(scheda_id: str, payload: dict = Depends(verify_token)):
    scheda = await db.schede_medicazione_med.find_one({"id": scheda_id}, {"_id": 0})
    if not scheda:
        raise HTTPException(status_code=404, detail="Scheda non trovata")
    if scheda["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    return scheda

@api_router.put("/schede-medicazione-med/{scheda_id}", response_model=SchedaMedicazioneMED)
async def update_scheda_medicazione_med(scheda_id: str, data: dict, payload: dict = Depends(verify_token)):
    scheda = await db.schede_medicazione_med.find_one({"id": scheda_id}, {"_id": 0})
    if not scheda:
        raise HTTPException(status_code=404, detail="Scheda non trovata")
    if scheda["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    await db.schede_medicazione_med.update_one({"id": scheda_id}, {"$set": data})
    updated = await db.schede_medicazione_med.find_one({"id": scheda_id}, {"_id": 0})
    return updated

# ============== SCHEDE IMPIANTO PICC ==============
@api_router.post("/schede-impianto-picc", response_model=SchedaImpiantoPICC)
async def create_scheda_impianto_picc(data: SchedaImpiantoPICCCreate, payload: dict = Depends(verify_token)):
    if data.ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    scheda = SchedaImpiantoPICC(**data.model_dump())
    doc = scheda.model_dump()
    await db.schede_impianto_picc.insert_one(doc)
    return scheda

@api_router.get("/schede-impianto-picc", response_model=List[SchedaImpiantoPICC])
async def get_schede_impianto_picc(
    patient_id: str,
    ambulatorio: Ambulatorio,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    schede = await db.schede_impianto_picc.find(
        {"patient_id": patient_id, "ambulatorio": ambulatorio.value},
        {"_id": 0}
    ).sort("data_impianto", -1).to_list(1000)
    return schede

@api_router.put("/schede-impianto-picc/{scheda_id}", response_model=SchedaImpiantoPICC)
async def update_scheda_impianto_picc(scheda_id: str, data: dict, payload: dict = Depends(verify_token)):
    scheda = await db.schede_impianto_picc.find_one({"id": scheda_id}, {"_id": 0})
    if not scheda:
        raise HTTPException(status_code=404, detail="Scheda non trovata")
    if scheda["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    await db.schede_impianto_picc.update_one({"id": scheda_id}, {"$set": data})
    updated = await db.schede_impianto_picc.find_one({"id": scheda_id}, {"_id": 0})
    return updated

# ============== SCHEDE GESTIONE PICC (MENSILE) ==============
@api_router.post("/schede-gestione-picc", response_model=SchedaGestionePICC)
async def create_scheda_gestione_picc(data: SchedaGestionePICCCreate, payload: dict = Depends(verify_token)):
    if data.ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    # Check if already exists for this month
    existing = await db.schede_gestione_picc.find_one({
        "patient_id": data.patient_id,
        "ambulatorio": data.ambulatorio.value,
        "mese": data.mese
    })
    if existing:
        raise HTTPException(status_code=400, detail="Esiste già una scheda per questo mese")
    
    scheda = SchedaGestionePICC(**data.model_dump())
    doc = scheda.model_dump()
    await db.schede_gestione_picc.insert_one(doc)
    return scheda

@api_router.get("/schede-gestione-picc", response_model=List[SchedaGestionePICC])
async def get_schede_gestione_picc(
    patient_id: str,
    ambulatorio: Ambulatorio,
    mese: Optional[str] = None,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    query = {"patient_id": patient_id, "ambulatorio": ambulatorio.value}
    if mese:
        query["mese"] = mese
    
    schede = await db.schede_gestione_picc.find(query, {"_id": 0}).sort("mese", -1).to_list(100)
    return schede

@api_router.put("/schede-gestione-picc/{scheda_id}", response_model=SchedaGestionePICC)
async def update_scheda_gestione_picc(scheda_id: str, data: dict, payload: dict = Depends(verify_token)):
    scheda = await db.schede_gestione_picc.find_one({"id": scheda_id}, {"_id": 0})
    if not scheda:
        raise HTTPException(status_code=404, detail="Scheda non trovata")
    if scheda["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.schede_gestione_picc.update_one({"id": scheda_id}, {"$set": data})
    updated = await db.schede_gestione_picc.find_one({"id": scheda_id}, {"_id": 0})
    return updated

# ============== PHOTOS ==============
@api_router.post("/photos")
async def upload_photo(
    patient_id: str = Form(...),
    ambulatorio: str = Form(...),
    tipo: str = Form(...),
    data: str = Form(...),
    descrizione: Optional[str] = Form(None),
    file: UploadFile = File(...),
    payload: dict = Depends(verify_token)
):
    if ambulatorio not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    contents = await file.read()
    image_data = base64.b64encode(contents).decode('utf-8')
    
    photo = Photo(
        patient_id=patient_id,
        ambulatorio=Ambulatorio(ambulatorio),
        tipo=tipo,
        descrizione=descrizione,
        data=data,
        image_data=image_data
    )
    doc = photo.model_dump()
    await db.photos.insert_one(doc)
    
    return {"id": photo.id, "message": "Foto caricata"}

@api_router.get("/photos")
async def get_photos(
    patient_id: str,
    ambulatorio: Ambulatorio,
    tipo: Optional[str] = None,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    query = {"patient_id": patient_id, "ambulatorio": ambulatorio.value}
    if tipo:
        query["tipo"] = tipo
    
    photos = await db.photos.find(query, {"_id": 0}).sort("data", -1).to_list(100)
    return photos

@api_router.get("/photos/{photo_id}")
async def get_photo(photo_id: str, payload: dict = Depends(verify_token)):
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    if photo["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    return photo

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, payload: dict = Depends(verify_token)):
    photo = await db.photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    if photo["ambulatorio"] not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    await db.photos.delete_one({"id": photo_id})
    return {"message": "Foto eliminata"}

# ============== DOCUMENTS ==============
@api_router.get("/documents")
async def get_documents(
    ambulatorio: Ambulatorio,
    categoria: Optional[str] = None,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    docs = DOCUMENT_TEMPLATES.copy()
    
    # Villa Ginestre only sees PICC documents
    if ambulatorio == Ambulatorio.VILLA_GINESTRE:
        docs = [d for d in docs if d["categoria"] == "PICC"]
    
    if categoria:
        docs = [d for d in docs if d["categoria"] == categoria]
    
    return docs

# ============== STATISTICS ==============
@api_router.get("/statistics")
async def get_statistics(
    ambulatorio: Ambulatorio,
    anno: int,
    mese: Optional[int] = None,
    tipo: Optional[str] = None,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    # Villa Ginestre only shows PICC stats
    if ambulatorio == Ambulatorio.VILLA_GINESTRE and tipo == "MED":
        raise HTTPException(status_code=400, detail="Villa delle Ginestre non ha statistiche MED")
    
    # Build date range
    if mese:
        start_date = f"{anno}-{mese:02d}-01"
        if mese == 12:
            end_date = f"{anno + 1}-01-01"
        else:
            end_date = f"{anno}-{mese + 1:02d}-01"
    else:
        start_date = f"{anno}-01-01"
        end_date = f"{anno + 1}-01-01"
    
    query = {
        "ambulatorio": ambulatorio.value,
        "data": {"$gte": start_date, "$lt": end_date}
    }
    if tipo:
        query["tipo"] = tipo
    elif ambulatorio == Ambulatorio.VILLA_GINESTRE:
        query["tipo"] = "PICC"
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(10000)
    
    # Calculate statistics
    total_accessi = len(appointments)
    unique_patients = len(set(a["patient_id"] for a in appointments))
    
    # Prestazioni count
    prestazioni_count = {}
    for app in appointments:
        for prest in app.get("prestazioni", []):
            prestazioni_count[prest] = prestazioni_count.get(prest, 0) + 1
    
    # Monthly breakdown
    monthly_stats = {}
    for app in appointments:
        month = app["data"][:7]  # YYYY-MM
        if month not in monthly_stats:
            monthly_stats[month] = {"accessi": 0, "pazienti": set(), "prestazioni": {}}
        monthly_stats[month]["accessi"] += 1
        monthly_stats[month]["pazienti"].add(app["patient_id"])
        for prest in app.get("prestazioni", []):
            monthly_stats[month]["prestazioni"][prest] = monthly_stats[month]["prestazioni"].get(prest, 0) + 1
    
    # Convert sets to counts
    for month in monthly_stats:
        monthly_stats[month]["pazienti_unici"] = len(monthly_stats[month]["pazienti"])
        del monthly_stats[month]["pazienti"]
    
    return {
        "anno": anno,
        "mese": mese,
        "ambulatorio": ambulatorio.value,
        "tipo": tipo,
        "totale_accessi": total_accessi,
        "pazienti_unici": unique_patients,
        "prestazioni": prestazioni_count,
        "dettaglio_mensile": monthly_stats
    }

@api_router.get("/statistics/compare")
async def compare_statistics(
    ambulatorio: Ambulatorio,
    periodo1_anno: int,
    periodo1_mese: Optional[int] = None,
    periodo2_anno: int = None,
    periodo2_mese: Optional[int] = None,
    tipo: Optional[str] = None,
    payload: dict = Depends(verify_token)
):
    if ambulatorio.value not in payload["ambulatori"]:
        raise HTTPException(status_code=403, detail="Non hai accesso a questo ambulatorio")
    
    # Get stats for both periods
    stats1 = await get_statistics(ambulatorio, periodo1_anno, periodo1_mese, tipo, payload)
    stats2 = await get_statistics(ambulatorio, periodo2_anno or periodo1_anno, periodo2_mese, tipo, payload)
    
    # Calculate differences
    diff = {
        "accessi": stats2["totale_accessi"] - stats1["totale_accessi"],
        "pazienti_unici": stats2["pazienti_unici"] - stats1["pazienti_unici"],
        "prestazioni": {}
    }
    
    all_prestazioni = set(stats1["prestazioni"].keys()) | set(stats2["prestazioni"].keys())
    for prest in all_prestazioni:
        val1 = stats1["prestazioni"].get(prest, 0)
        val2 = stats2["prestazioni"].get(prest, 0)
        diff["prestazioni"][prest] = val2 - val1
    
    return {
        "periodo1": stats1,
        "periodo2": stats2,
        "differenze": diff
    }

# ============== CALENDAR HELPERS ==============
@api_router.get("/calendar/holidays")
async def get_calendar_holidays(anno: int):
    return get_holidays(anno)

@api_router.get("/calendar/slots")
async def get_time_slots():
    """Returns available time slots"""
    morning_slots = []
    afternoon_slots = []
    
    # Morning: 08:30 - 13:00
    current = datetime.strptime("08:30", "%H:%M")
    end_morning = datetime.strptime("13:00", "%H:%M")
    while current < end_morning:
        morning_slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=30)
    
    # Afternoon: 15:00 - 17:00
    current = datetime.strptime("15:00", "%H:%M")
    end_afternoon = datetime.strptime("17:00", "%H:%M")
    while current < end_afternoon:
        afternoon_slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=30)
    
    return {
        "mattina": morning_slots,
        "pomeriggio": afternoon_slots,
        "tutti": morning_slots + afternoon_slots
    }

# ============== ROOT ==============
@api_router.get("/")
async def root():
    return {"message": "Ambulatorio Infermieristico API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
