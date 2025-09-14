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

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import SignIn from "./SignIn.jsx";
import SignUp from "./SignUp.jsx";

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
                
                    <Route path="/" element={<PatientDashboard />} />
                
                
                <Route path="/PatientDashboard" element={<PatientDashboard />} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/patientdashboard" element={<PatientDashboard />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Patients" element={<Patients />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Staff" element={<Staff />} />
                
                <Route path="/TherapyScheduling" element={<TherapyScheduling />} />
                
                <Route path="/Guardians" element={<Guardians />} />
                
                <Route path="/Notifications" element={<Notifications />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/DoctorDashboard" element={<DoctorDashboard />} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/doctordashboard" element={<DoctorDashboard />} />
                
                <Route path="/TherapistDashboard" element={<TherapistDashboard />} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/therapistdashboard" element={<TherapistDashboard />} />
                
                <Route path="/GuardianDashboard" element={<GuardianDashboard />} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/guardiandashboard" element={<GuardianDashboard />} />
                
                <Route path="/SupportDashboard" element={<SupportDashboard />} />
                {/* lowercase alias for role-based redirect */}
                <Route path="/supportdashboard" element={<SupportDashboard />} />
                
                <Route path="/dashboard" element={<Dashboard />} />
                
                <Route path="/Hospitals" element={<Hospitals />} />
                
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