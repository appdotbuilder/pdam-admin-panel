
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Wrench, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { User, Customer, MonthlyBill, Installation, MonthlyReport } from '../../../server/src/schema';

interface DashboardProps {
  currentUser: User;
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load all dashboard data in parallel
      const [customersData, billsData, installationsData] = await Promise.all([
        trpc.getCustomers.query(),
        trpc.getMonthlyBills.query(),
        trpc.getInstallations.query()
      ]);

      setCustomers(customersData);
      setBills(billsData);
      setInstallations(installationsData);

      // Get current month report
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      try {
        const reportData = await trpc.getMonthlyReport.query({ month: currentMonth });
        setMonthlyReport(reportData);
      } catch (error) {
        console.error('Failed to load monthly report:', error);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate dashboard statistics
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const unpaidBills = bills.filter(b => b.status === 'unpaid').length;
  const pendingInstallations = installations.filter(i => i.status === 'pending').length;
  const totalOutstanding = bills
    .filter(b => b.status === 'unpaid')
    .reduce((sum, bill) => sum + bill.amount, 0);

  const currentMonth = new Date().toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'long' 
  });

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          Selamat Datang, {currentUser.username}! 👋
        </h2>
        <p className="text-blue-100">
          Dashboard Overview - {currentMonth}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pelanggan Aktif</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              dari {customers.length} total pelanggan
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagihan Belum Lunas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unpaidBills}</div>
            <p className="text-xs text-muted-foreground">
              Rp {totalOutstanding.toLocaleString('id-ID')} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instalasi Pending</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInstallations}</div>
            <p className="text-xs text-muted-foreground">
              menunggu penyelesaian
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            {monthlyReport && monthlyReport.net_balance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {monthlyReport ? monthlyReport.total_income.toLocaleString('id-ID') : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              bulan ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Tagihan Terbaru
            </CardTitle>
            <CardDescription>
              5 tagihan terakhir yang dibuat
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bills.length > 0 ? (
              <div className="space-y-3">
                {bills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Customer ID: {bill.customer_id}</p>
                      <p className="text-sm text-gray-500">{bill.bill_month}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rp {bill.amount.toLocaleString('id-ID')}</p>
                      <Badge variant={bill.status === 'paid' ? 'default' : 'destructive'}>
                        {bill.status === 'paid' ? 'Lunas' : 'Belum Lunas'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Belum ada tagihan. Generate tagihan bulanan untuk memulai.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Installations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-yellow-500" />
              Instalasi Terbaru
            </CardTitle>
            <CardDescription>
              5 instalasi terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {installations.length > 0 ? (
              <div className="space-y-3">
                {installations.slice(0, 5).map((installation) => (
                  <div key={installation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Customer ID: {installation.customer_id}</p>
                      <p className="text-sm text-gray-500">
                        {installation.scheduled_date 
                          ? new Date(installation.scheduled_date).toLocaleDateString('id-ID')
                          : 'Belum dijadwalkan'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rp {installation.installation_fee.toLocaleString('id-ID')}</p>
                      <Badge variant={installation.status === 'completed' ? 'default' : 'secondary'}>
                        {installation.status === 'completed' ? 'Selesai' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Belum ada instalasi yang tercatat.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      {monthlyReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Ringkasan Bulanan - {currentMonth}
            </CardTitle>
            <CardDescription>
              Laporan keuangan bulan berjalan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Pendapatan Langganan</p>
                <p className="text-lg font-bold text-blue-600">
                  Rp {monthlyReport.subscription_income.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Pendapatan Instalasi</p>
                <p className="text-lg font-bold text-green-600">
                  Rp {monthlyReport.installation_income.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Biaya Material</p>
                <p className="text-lg font-bold text-red-600">
                  Rp {monthlyReport.material_expenses.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Pendapatan</p>
                <p className="text-lg font-bold text-purple-600">
                  Rp {monthlyReport.total_income.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Saldo Bersih</p>
                <p className={`text-lg font-bold ${
                  monthlyReport.net_balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  Rp {monthlyReport.net_balance.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
