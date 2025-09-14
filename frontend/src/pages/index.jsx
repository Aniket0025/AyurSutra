import Layout from "./Layout.jsx";

import PatientDashboard from "./PatientDashboard";

import Dashboard from "./Dashboard";

import Patients from "./Patients";

import Settings from "./Settings";

import Staff from "./Staff";

import TherapyScheduling from "./TherapyScheduling";

import Guardians from "./Guardians";

import Notifications from "./Notifications";

import Reports from "./Reports";

import Analytics from "./Analytics";

import DoctorDashboard from "./DoctorDashboard";

import TherapistDashboard from "./TherapistDashboard";

import GuardianDashboard from "./GuardianDashboard";

import SupportDashboard from "./SupportDashboard";

// Use the same Dashboard component for lowercase route as well

import Hospitals from "./Hospitals";
import PatientAppointments from "./PatientAppointments";
import DoctorAppointments from "./DoctorAppointments";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import SignIn from "./SignIn.jsx";
import SignUp from "./SignUp.jsx";
import RoleGuard from "../components/auth/RoleGuard.jsx";

const PAGES = {
    
    PatientDashboard: PatientDashboard,
    
    Dashboard: Dashboard,
    
    Patients: Patients,
    
    Settings: Settings,
    
    Staff: Staff,
    
    TherapyScheduling: TherapyScheduling,
    
    Guardians: Guardians,
    
    Notifications: Notifications,
    
    Reports: Reports,
    
    Analytics: Analytics,
    
    DoctorDashboard: DoctorDashboard,
    
    TherapistDashboard: TherapistDashboard,
    
    GuardianDashboard: GuardianDashboard,
    
    SupportDashboard: SupportDashboard,
    
    dashboard: Dashboard,
    
    Hospitals: Hospitals,
    Appointments: PatientAppointments,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<RoleGuard roles={[]}> <PatientDashboard /> </RoleGuard>} />
                
                
                <Route path="/PatientDashboard" element={<RoleGuard roles={["patient","super_admin"]}> <PatientDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/patientdashboard" element={<RoleGuard roles={["patient","super_admin"]}> <PatientDashboard /> </RoleGuard>} />
                
                <Route path="/Dashboard" element={<RoleGuard roles={["super_admin","hospital_admin","admin"]}> <Dashboard /> </RoleGuard>} />
                
                <Route path="/Patients" element={<RoleGuard roles={["super_admin","hospital_admin","admin","doctor","support","guardian"]}> <Patients /> </RoleGuard>} />
                
                <Route path="/Settings" element={<RoleGuard roles={[]}> <Settings /> </RoleGuard>} />
                
                <Route path="/Staff" element={<RoleGuard roles={["super_admin","hospital_admin","admin"]}> <Staff /> </RoleGuard>} />
                
                <Route path="/TherapyScheduling" element={<RoleGuard roles={["super_admin","hospital_admin","admin","doctor","therapist","patient"]}> <TherapyScheduling /> </RoleGuard>} />
                
                <Route path="/Guardians" element={<RoleGuard roles={["super_admin","hospital_admin","admin","doctor"]}> <Guardians /> </RoleGuard>} />
                
                <Route path="/Notifications" element={<RoleGuard roles={[]}> <Notifications /> </RoleGuard>} />
                
                <Route path="/Reports" element={<RoleGuard roles={["super_admin","hospital_admin","admin"]}> <Reports /> </RoleGuard>} />
                
                <Route path="/Analytics" element={<RoleGuard roles={["super_admin","hospital_admin","admin"]}> <Analytics /> </RoleGuard>} />
                
                <Route path="/DoctorDashboard" element={<RoleGuard roles={["doctor","super_admin"]}> <DoctorDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/doctordashboard" element={<RoleGuard roles={["doctor","super_admin"]}> <DoctorDashboard /> </RoleGuard>} />
                
                <Route path="/TherapistDashboard" element={<RoleGuard roles={["therapist","super_admin"]}> <TherapistDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/therapistdashboard" element={<RoleGuard roles={["therapist","super_admin"]}> <TherapistDashboard /> </RoleGuard>} />
                
                <Route path="/GuardianDashboard" element={<RoleGuard roles={["guardian","super_admin"]}> <GuardianDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/guardiandashboard" element={<RoleGuard roles={["guardian","super_admin"]}> <GuardianDashboard /> </RoleGuard>} />
                
                <Route path="/SupportDashboard" element={<RoleGuard roles={["support","super_admin"]}> <SupportDashboard /> </RoleGuard>} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/supportdashboard" element={<RoleGuard roles={["support","super_admin"]}> <SupportDashboard /> </RoleGuard>} />
                
                <Route path="/dashboard" element={<RoleGuard roles={["super_admin","hospital_admin","admin"]}> <Dashboard /> </RoleGuard>} />
                
                <Route path="/Hospitals" element={<RoleGuard roles={["super_admin","admin","hospital_admin"]}> <Hospitals /> </RoleGuard>} />
                
                {/* Patient appointments */}
                <Route path="/Appointments" element={<RoleGuard roles={["patient","super_admin"]}> <PatientAppointments /> </RoleGuard>} />
                {/* Doctor/Therapist appointments management */}
                <Route path="/DoctorAppointments" element={<RoleGuard roles={["doctor","therapist","super_admin"]}> <DoctorAppointments /> </RoleGuard>} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <Routes>
                {/* Public auth routes without Layout */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                {/* All other app routes under Layout */}
                <Route path="/*" element={<PagesContent />} />
            </Routes>
        </Router>
    );
}