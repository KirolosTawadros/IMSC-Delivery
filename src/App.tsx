import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import Layout from './components/Layout';
import Login from './pages/Login';
import TodayTrips from './pages/TodayTrips';
import TripDetails from './pages/TripDetails';
import ScanScreen from './pages/ScanScreen';
import ManualEntry from './pages/ManualEntry';
import CompletionScreen from './pages/CompletionScreen';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const loggedUser = localStorage.getItem('logged_user');
  if (!loggedUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {

  useEffect(() => {
    // Initialize OneSignal
    OneSignal.init({
      appId: "95d7eaa3-8b84-4cd3-a3b6-b31cb60bc8cf",
      allowLocalhostAsSecureOrigin: true
    }).then(() => {
      // Show native prompt if not subscribed
      OneSignal.Slidedown.promptPush();
    }).catch(e => console.error("OneSignal Init Error", e));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/trips" replace />} />
          <Route path="trips" element={<TodayTrips />} />
          <Route path="trips/:tripId" element={<TripDetails />} />
          <Route path="trips/:tripId/stops/:stopId/scan" element={<ScanScreen />} />
          <Route path="trips/:tripId/stops/:stopId/manual" element={<ManualEntry />} />
          <Route path="trips/:tripId/stops/:stopId/complete" element={<CompletionScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
