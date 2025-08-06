
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Users, FileText, Wrench, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import type { User } from '../../server/src/schema';

interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check if user is logged in (this would normally check localStorage or session)
  useEffect(() => {
    const storedUser = localStorage.getItem('pdam_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('pdam_user');
      }
    }
  }, []);

  const handleLogin = useCallback(async (username: string, password: string): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await trpc.login.mutate({ username, password });
      if (response.success && response.user) {
        setCurrentUser(response.user);
        localStorage.setItem('pdam_user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('pdam_user');
    setActiveTab('dashboard');
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">💧</div>
            <h1 className="text-3xl font-bold text-blue-800">PDAM Swadaya</h1>
            <p className="text-gray-600 mt-2">Sistem Administrasi Air Bersih</p>
          </div>
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">💧</div>
              <div>
                <h1 className="text-2xl font-bold text-blue-800">PDAM Swadaya</h1>
                <p className="text-sm text-gray-500">Panel Administrasi</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.username}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pelanggan
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Tagihan
            </TabsTrigger>
            <TabsTrigger value="installations" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Instalasi
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Laporan
            </TabsTrigger>
            {currentUser.role === 'admin' && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Pengaturan
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="customers">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🏠 Manajemen Pelanggan</h2>
                <p className="text-gray-600">Kelola data pelanggan dan status berlangganan mereka.</p>
              </div>
              {/* Customer management components will be added here */}
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Sistem Tagihan Bulanan</h2>
                <p className="text-gray-600">Kelola tagihan bulanan dan pembayaran pelanggan.</p>
              </div>
              {/* Billing management components will be added here */}
            </div>
          </TabsContent>

          <TabsContent value="installations">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🔧 Manajemen Instalasi</h2>
                <p className="text-gray-600">Kelola instalasi baru dan biaya material.</p>
              </div>
              {/* Installation management components will be added here */}
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Laporan dan Rekap</h2>
                <p className="text-gray-600">Generate dan lihat berbagai laporan keuangan.</p>
              </div>
              {/* Reports components will be added here */}
            </div>
          </TabsContent>

          {currentUser.role === 'admin' && (
            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Pengaturan Sistem</h2>
                  <p className="text-gray-600">Kelola pengaturan sistem dan akun pengguna.</p>
                </div>
                {/* Settings components will be added here */}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;
