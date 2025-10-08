/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from "react";
import { TherapySession } from "@/services";
import { Patient } from "@/services";
import { User } from "@/services";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Activity,
  CheckCircle,
  Stethoscope,
  Wind,
  Droplet,
  Flame,
  Mountain,
  Heart,
  
} from "lucide-react";
import { format } from "date-fns";
import PropTypes from 'prop-types';
// View-only: scheduling modal removed

function TherapyScheduling({ currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  // view-only: no calendar view
  // View-only: no scheduling/editing state

  const loadData = useCallback(async () => {
    // Resolve user from props or fallback to API to ensure rendering
    const user = currentUser || await User.me().catch(() => null);
    if (!user) {
      setIsLoading(false);
      setStatusMessage('No authenticated user found.');
      return;
    }

    setIsLoading(true);
    try {
      console.log("Loading therapy scheduling data for user:", user);

      let patientFilter = {};
      let sessionFilter = {};

      if (user.role === 'super_admin') {
        console.log('Super admin: Loading all data');
      } else if (user.hospital_id && ['clinic_admin', 'doctor'].includes(user.role)) {
        patientFilter = { hospital_id: user.hospital_id };
        sessionFilter = { hospital_id: user.hospital_id };
        console.log('Hospital-based user: Filtering by hospital_id:', user.hospital_id);
      } else if (user.role === 'patient') {
        // First fetch the patient record, then load sessions by patient_id
        patientFilter = { user_id: user.id };
        console.log('Patient: Resolving patient record for user_id:', user.id);

        let patientsData = await Patient.filter(patientFilter, '-created_date', 2).catch(err => {
          console.error('Error loading patient record for user:', err);
          return [];
        });

        const patientId = patientsData?.[0]?.id;
        console.log('Resolved patientId:', patientId);

        if (!patientId) {
          // Fallback: attempt to resolve by email if available
          if (user?.email) {
            console.log('Attempting fallback resolve by email:', user.email);
            patientsData = await Patient.filter({ email: user.email }, '-created_date', 2).catch(() => []);
          }
          const fallbackId = patientsData?.[0]?.id;
          if (!fallbackId) {
            setPatients([]);
            setSessions([]);
            setIsLoading(false);
            setStatusMessage('No patient record linked to your account.');
            return;
          }
          const sessionsData = await TherapySession.filter({ patient_id: fallbackId }, '-created_date', 500).catch(err => {
            console.error('Error loading sessions for fallback patient:', err);
            return [];
          });
          setPatients(patientsData);
          setSessions(sessionsData);
          setIsLoading(false);
          setStatusMessage(sessionsData.length ? '' : 'No sessions found for your account.');
          return;
        }

        const sessionsData = await TherapySession.filter({ patient_id: patientId }, '-created_date', 500).catch(err => {
          console.error('Error loading sessions for patient:', err);
          return [];
        });

        setPatients(patientsData);
        setSessions(sessionsData);
        setIsLoading(false);
        setStatusMessage(sessionsData.length ? '' : 'No sessions found for your account.');
        return;
      } else if (user.role === 'guardian') {
        patientFilter = { guardian_ids: user.id };
        sessionFilter = {}; // Will be filtered based on patient results
        console.log('Guardian: Filtering by guardian_ids:', user.id);
      }

      console.log('Using filters for scheduling:', { patientFilter, sessionFilter });

      const [sessionsData, patientsData] = await Promise.all([
        TherapySession.filter(sessionFilter, '-created_date', 500).catch(err => {
          console.error('Error loading sessions:', err);
          return [];
        }),
        Patient.filter(patientFilter, '-created_date', 500).catch(err => {
          console.error('Error loading patients:', err);
          return [];
        })
      ]);

      console.log("Raw loaded data:", {
        sessions: sessionsData,
        patients: patientsData,
        sessionCount: sessionsData.length,
        patientCount: patientsData.length
      });

      // If guardian, filter sessions to only show sessions for their patients

      let finalSessions = sessionsData;
      if (user.role === 'guardian' && patientsData.length > 0) {
        const patientIds = patientsData.map(p => p.id);
        finalSessions = sessionsData.filter(session => patientIds.includes(session.patient_id));
        console.log("Guardian filtered sessions:", finalSessions);
      }

      console.log("Final scheduling data:", {
        sessions: finalSessions.length,
        patients: patientsData.length,
        sampleSessions: finalSessions.slice(0, 3)
      });

      setSessions(finalSessions);
      setPatients(patientsData);
      setStatusMessage(finalSessions.length ? '' : 'No sessions found for your account.');
    } catch (error) {
      console.error("Error loading scheduling data:", error);
      setSessions([]);
      setPatients([]);
      setStatusMessage('Failed to load sessions.');
    }
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    // Always attempt to load data; loadData resolves user if prop is missing
    loadData();
  }, [currentUser, loadData]);

  // Group sessions by scheduled_date for compact list
  const sessionsByDate = (() => {
    const map = new Map();
    const sorted = [...sessions].sort((a,b) => {
      const ad = new Date(a.scheduled_date || 0).getTime();
      const bd = new Date(b.scheduled_date || 0).getTime();
      if (ad !== bd) return ad - bd;
      return String(a.scheduled_time || '').localeCompare(String(b.scheduled_time || ''));
    });
    sorted.forEach(s => {
      const key = s.scheduled_date || 'Unknown Date';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return map;
  })();

  const getSessionsCount = (type) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    switch (type) {
      case 'today':
        return sessions.filter(s => (s.scheduled_date === today) || (format(new Date(s.scheduled_date), 'yyyy-MM-dd') === today)).length;
      case 'completed':
        return sessions.filter(s => s.status === 'completed').length;
      case 'pending':
        return sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress').length;
      default:
        return sessions.length;
    }
  };

  // View-only: no schedule/edit/delete handlers

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.full_name || `Patient ${patientId}`;
  };

  const therapyVisuals = {
    'vamana': { 
      color: 'from-sky-400 to-blue-500', 
      bgColor: 'bg-gradient-to-br from-sky-100 to-blue-100',
      icon: <Flame className="w-4 h-4" />, 
      emoji: '🤮',
      borderColor: 'border-sky-400'
    },
    'virechana': { 
      color: 'from-green-400 to-emerald-500', 
      bgColor: 'bg-gradient-to-br from-green-100 to-emerald-100',
      icon: <Droplet className="w-4 h-4" />, 
      emoji: '💊',
      borderColor: 'border-green-400'
    },
    'basti': { 
      color: 'from-yellow-400 to-orange-500', 
      bgColor: 'bg-gradient-to-br from-yellow-100 to-orange-100',
      icon: <Wind className="w-4 h-4" />, 
      emoji: '💉',
      borderColor: 'border-yellow-400'
    },
    'nasya': { 
      color: 'from-cyan-400 to-teal-500', 
      bgColor: 'bg-gradient-to-br from-cyan-100 to-teal-100',
      icon: <Stethoscope className="w-4 h-4" />, 
      emoji: '👃',
      borderColor: 'border-cyan-400'
    },
    'raktamokshana': { 
      color: 'from-red-400 to-pink-500', 
      bgColor: 'bg-gradient-to-br from-red-100 to-pink-100',
      icon: <Heart className="w-4 h-4" />, 
      emoji: '🩸',
      borderColor: 'border-red-400'
    },
    'abhyanga': { 
      color: 'from-emerald-400 to-green-500', 
      bgColor: 'bg-gradient-to-br from-emerald-100 to-green-100',
      icon: <Users className="w-4 h-4" />, 
      emoji: '💆‍♀️',
      borderColor: 'border-emerald-400'
    },
    'shirodhara': { 
      color: 'from-indigo-400 to-blue-500', 
      bgColor: 'bg-gradient-to-br from-indigo-100 to-blue-100',
      icon: <Activity className="w-4 h-4" />, 
      emoji: '🫗',
      borderColor: 'border-indigo-400'
    },
    'swedana': { 
      color: 'from-orange-400 to-red-500', 
      bgColor: 'bg-gradient-to-br from-orange-100 to-red-100',
      icon: <Mountain className="w-4 h-4" />, 
      emoji: '♨️',
      borderColor: 'border-orange-400'
    },
    'default': { 
      color: 'from-gray-400 to-gray-500', 
      bgColor: 'bg-gradient-to-br from-gray-100 to-gray-200',
      icon: <Stethoscope className="w-4 h-4" />, 
      emoji: '🏥',
      borderColor: 'border-gray-400'
    }
  };

  const getTherapyVisual = (therapyType) => {
    return therapyVisuals[therapyType] || therapyVisuals.default;
  };

  const StatCard = ({ title, value, icon: Icon, color }) => {
    return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {statusMessage && (
          <div className="px-4 py-3 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200">
            {statusMessage}
          </div>
        )}
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
      </div>
    </motion.div>
    );
  };

  StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.string.isRequired
  };

  const SessionCard = ({ session }) => {
    const visual = getTherapyVisual(session.therapy_type);
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.2 }}
        className={`relative p-3 rounded-xl ${visual.bgColor} border-l-4 ${visual.borderColor} shadow-sm transition-all duration-200`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{visual.emoji}</span>
              <h4 className="font-semibold text-gray-800 text-sm capitalize truncate">
                {session.therapy_type.replace(/_/g, ' ')}
              </h4>
            </div>
            <p className="text-gray-600 text-xs mb-2 truncate">{getPatientName(session.patient_id)}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{session.scheduled_time}</span>
              {session.room_number && (
                <>
                  <span>•</span>
                  <span className="truncate">Room {session.room_number}</span>
                </>
              )}
            </div>
          </div>
          {/* View-only: no edit/delete controls */}
        </div>
      </motion.div>
    );
  };

  SessionCard.propTypes = {
    session: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      therapy_type: PropTypes.string.isRequired,
      patient_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      scheduled_time: PropTypes.string,
      scheduled_date: PropTypes.string,
      room_number: PropTypes.string
    }).isRequired
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-8 bg-gradient-to-br from-gray-50 to-blue-50/20 min-h-screen">
      <style>{``}</style>
      
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">Therapy Scheduling</h1>
            <p className="text-gray-500 text-xs md:text-base">View scheduled appointments and therapy sessions</p>
          </div>
        </div>

        <div />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Today's Sessions"
          value={getSessionsCount('today')}
          icon={CalendarIcon}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="This Week"
          value={getSessionsCount('week')}
          icon={Activity}
          color="from-green-500 to-green-600"
        />
        <StatCard
          title="Completed"
          value={getSessionsCount('completed')}
          icon={CheckCircle}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Pending"
          value={getSessionsCount('pending')}
          icon={Clock}
          color="from-orange-500 to-orange-600"
        />
      </div>

      {/* Compact sessions list */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3 md:p-6 shadow-xl border border-white/50">
        {sessions.length === 0 ? (
          <div className="text-gray-500 text-center py-12">No sessions scheduled.</div>
        ) : (
          <div className="space-y-6">
            {[...sessionsByDate.keys()].map(dateKey => (
              <div key={dateKey}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm md:text-base font-semibold text-gray-800">
                    {dateKey ? format(new Date(dateKey), 'EEE, MMM d, yyyy') : 'Unknown Date'}
                  </h3>
                  <span className="text-xs text-gray-500">{sessionsByDate.get(dateKey)?.length} sessions</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {sessionsByDate.get(dateKey).map(s => (
                      <div key={s.id} className="session-card">
                        <SessionCard session={s} />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View-only: scheduling modal removed */}
    </div>
  );
}

TherapyScheduling.propTypes = {
  currentUser: PropTypes.object
};

export default TherapyScheduling;