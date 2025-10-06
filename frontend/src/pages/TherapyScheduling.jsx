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
  Plus,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle,
  Edit,
  Trash2,
  User as UserIcon,
  Stethoscope,
  Wind,
  Droplet,
  Flame,
  Mountain,
  Heart,
  Building
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import PropTypes from 'prop-types';
import ScheduleSessionModal from "../components/scheduling/ScheduleSessionModal";

function TherapyScheduling({ currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewType, setViewType] = useState('week');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

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

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getSessionsForDay = (date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const daySessions = sessions.filter(session => {
      // Try multiple date formats to ensure compatibility
      const sessionDate = session.scheduled_date;
      if (!sessionDate) return false;
      
      // Direct string comparison
      if (sessionDate === dateString) return true;
      
      // Try parsing the date if it's in a different format
      try {
        const parsedDate = format(new Date(sessionDate), 'yyyy-MM-dd');
        return parsedDate === dateString;
      } catch {
        console.warn("Invalid date format in session:", sessionDate);
        return false;
      }
    });
    
    console.log(`Sessions for ${dateString}:`, daySessions);
    return daySessions;
  };

  const getSessionsCount = (type) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    switch (type) {
      case 'today':
        return sessions.filter(s => {
          try {
            return format(new Date(s.scheduled_date), 'yyyy-MM-dd') === today;
          } catch {
            return s.scheduled_date === today;
          }
        }).length;
      case 'week':
        return sessions.filter(s => {
          try {
            const sessionDate = format(new Date(s.scheduled_date), 'yyyy-MM-dd');
            return sessionDate >= weekStart && sessionDate <= weekEnd;
          } catch {
            return s.scheduled_date >= weekStart && s.scheduled_date <= weekEnd;
          }
        }).length;
      case 'completed':
        return sessions.filter(s => s.status === 'completed').length;
      case 'pending':
        return sessions.filter(s => s.status === 'scheduled' || s.status === 'in_progress').length;
      default:
        return 0;
    }
  };

  const handleScheduleSession = () => {
    setSelectedSession(null);
    setShowScheduleModal(true);
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setShowScheduleModal(true);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;

    try {
      await TherapySession.delete(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      window.showNotification?.({
        type: 'success',
        title: 'Session Deleted',
        message: 'Therapy session has been removed successfully.',
        autoClose: true
      });
    } catch (error) {
      console.error("Failed to delete session:", error);
      window.showNotification?.({
        type: 'error',
        title: 'Delete Failed',
        message: 'Unable to delete session. Please try again.',
        autoClose: true
      });
    }
  };

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
        className={`relative p-3 rounded-xl ${visual.bgColor} border-l-4 ${visual.borderColor} shadow-sm hover:shadow-md group cursor-pointer transition-all duration-200`}
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
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleEditSession(session);
              }} 
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Session"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSession(session.id);
              }} 
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Session"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
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
      <style>{`
        :root {
          --herbal-green: #4CAF50;
          --mint-green: #81C784;
          --sky-blue: #29B6F6;
          --aqua-blue: #4DD0E1;
          --golden-sand: #FFD54F;
        }

        @media (max-width: 768px) {
          .calendar-grid {
            min-width: 100%;
            overflow-x: auto;
          }
          
          .time-slot {
            font-size: 0.75rem;
            padding: 0.25rem;
          }
          
          .day-header {
            min-height: 4rem;
            padding: 0.5rem;
          }
          
          .session-card {
            margin-bottom: 0.25rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
      
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">Therapy Scheduling</h1>
            <p className="text-gray-500 text-xs md:text-base">Manage appointments and therapy sessions</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {['Week', 'Day', 'Month'].map((view) => (
              <button
                key={view}
                onClick={() => setViewType(view.toLowerCase())}
                className={`px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex-1 ${
                  viewType === view.toLowerCase()
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleScheduleSession}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-3 md:px-6 py-2.5 md:py-3 rounded-2xl hover:shadow-lg transition-all duration-300 text-xs md:text-base font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule Session</span>
            <span className="sm:hidden">Schedule</span>
          </button>
        </div>
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

      {/* Enhanced Calendar Navigation */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3 md:p-6 shadow-xl border border-white/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <h2 className="text-base md:text-xl font-bold text-gray-900 text-center">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 md:px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors text-xs md:text-sm font-medium flex-shrink-0"
          >
            Today
          </button>
        </div>

        {/* Enhanced Weekly Calendar Grid */}
        <div className="overflow-x-auto calendar-grid">
          <div className="grid grid-cols-8 gap-2 md:gap-4 min-w-[800px]">
            {/* Time Column */}
            <div className="space-y-2 md:space-y-4">
              <div className="h-16 md:h-24 flex items-center justify-center font-medium text-gray-400 text-xs md:text-sm day-header">
                Time
              </div>
              {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'].map(time => (
                <div key={time} className="h-16 md:h-20 flex items-start justify-center text-xs md:text-sm text-gray-500 pt-2 time-slot">
                  <span className="hidden md:inline">{time}</span>
                  <span className="md:hidden">{time.replace(' AM', 'A').replace(' PM', 'P')}</span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {getWeekDays().map((day) => (
              <div key={day.toISOString()} className="space-y-2 md:space-y-4">
                <div className={`h-16 md:h-24 flex flex-col items-center justify-center rounded-2xl transition-all duration-300 day-header ${
                  isToday(day) 
                    ? 'bg-gradient-to-br from-blue-400 to-green-400 text-white shadow-lg' 
                    : 'bg-white/70 hover:bg-white/90 border border-gray-100'
                }`}>
                  <div className="text-xs md:text-sm font-medium">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-xl md:text-3xl font-bold ${isToday(day) ? 'text-white' : 'text-gray-800'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className={`text-xs ${isToday(day) ? 'text-white/80' : 'text-gray-500'}`}>
                    {getSessionsForDay(day).length} sessions
                  </div>
                </div>
                
                <div className="space-y-1 md:space-y-2 min-h-[300px] md:min-h-[600px]">
                  <AnimatePresence>
                    {getSessionsForDay(day).map(session => (
                      <div key={session.id} className="session-card">
                        <SessionCard session={session} />
                      </div>
                    ))}
                  </AnimatePresence>
                  {getSessionsForDay(day).length === 0 && (
                    <div className="text-xs md:text-sm text-gray-400 text-center py-2">No sessions</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Data Debug Information */}
        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl text-xs border border-blue-200">
          <div className="flex flex-wrap items-center gap-4 text-gray-700">
            <span className="flex items-center gap-1">
              <Activity className="w-4 h-4 text-blue-600" />
              <strong>{sessions.length}</strong> sessions loaded
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4 text-green-600" />
              <strong>{patients.length}</strong> patients
            </span>
            <span className="flex items-center gap-1">
              <UserIcon className="w-4 h-4 text-purple-600" />
              {currentUser?.role} - {currentUser?.email}
            </span>
            {currentUser?.hospital_id && (
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4 text-orange-600" />
                Hospital: {currentUser.hospital_id}
              </span>
            )}
          </div>
          {sessions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <p className="font-medium text-gray-800 mb-1">Recent sessions:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {sessions.slice(0, 3).map(session => (
                  <div key={session.id} className="bg-white/60 rounded-lg p-2">
                    <span className="font-medium capitalize">{session.therapy_type.replace('_', ' ')}</span>
                    <br />
                    <span className="text-gray-600">{session.scheduled_date} at {session.scheduled_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        patients={patients}
        onSessionScheduled={loadData}
        currentUser={currentUser}
      />
    </div>
  );
}

TherapyScheduling.propTypes = {
  currentUser: PropTypes.object
};

export default TherapyScheduling;