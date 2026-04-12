import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  Banknote,
  Camera,
  CreditCard,
  FileSpreadsheet,
  MapPin,
  PackageCheck,
  Truck,
  Wallet,
} from "lucide-react";
import {
  DeliveryTrackerState,
  DriverRole,
  PaymentMethod,
  Role,
  buildDashboardMetrics,
  buildOutstandingRows,
  createDeliveryRecord,
  createSeedState,
  exportRowsToCsv,
  formatCurrency,
  getVehicleStopCounts,
  getVehicleStatusTone,
  listDeliveryRows,
} from "@/lib/delivery-tracker";

const STORAGE_KEY = "delivery-tracker-state-v1";
const roleOrder: Role[] = ["admin", "driver", "finance"];
const paymentMethods: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Card", "Credit"];
const palette = ["#123524", "#3E7B55", "#85A947", "#F4C95D", "#D95D39"];

const roleTitles: Record<Role, string> = {
  admin: "Admin Control",
  driver: "Driver Console",
  finance: "Finance Desk",
};

const roleDescriptions: Record<Role, string> = {
  admin: "Manage vehicles, drivers, delivery activity, and operational performance.",
  driver: "Log stops, capture proof, enter invoice references, and record collections on the road.",
  finance: "Track collections, monitor outstanding balances, and export customer ledgers.",
};

const parseRole = (pathname: string): Role => {
  const role = pathname.replace("/", "") as Role;
  return roleOrder.includes(role) ? role : "admin";
};

const StatCard = ({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Truck;
}) => (
  <div className="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_20px_60px_rgba(18,53,36,0.08)] backdrop-blur">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-600">{detail}</p>
      </div>
      <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
        <Icon className="h-5 w-5" />
      </span>
    </div>
  </div>
);

const SectionCard = ({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) => (
  <section className="rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(18,53,36,0.08)] backdrop-blur">
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const buttonClass =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-300";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = parseRole(location.pathname);

  const [state, setState] = useState<DeliveryTrackerState>(() => {
    if (typeof window === "undefined") {
      return createSeedState();
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as DeliveryTrackerState) : createSeedState();
  });

  const [driverId, setDriverId] = useState<DriverRole>("drv-001");
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    status: "Active",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    vehicleId: "veh-001",
    customerId: "cust-001",
    location: "MG Road, Bengaluru",
    arrivalTime: "09:30",
    departureTime: "09:50",
    deliveryStatus: "Delivered",
    productName: "Beverage Crate",
    quantity: "24",
    deliveryDate: new Date().toISOString().slice(0, 10),
    invoiceReference: "INV-2026-2001",
    invoiceAmount: "18250",
    invoiceDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "UPI" as PaymentMethod,
    amountReceived: "10000",
    paymentDate: new Date().toISOString().slice(0, 10),
    creditAmount: "500",
    creditReason: "Breakage adjustment",
    proofName: "",
    proofImage: "",
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (location.pathname === "/") {
      navigate("/admin", { replace: true });
    }
  }, [location.pathname, navigate]);

  const dashboard = useMemo(() => buildDashboardMetrics(state), [state]);
  const ledgerRows = useMemo(() => state.customerLedger, [state.customerLedger]);
  const deliveryRows = useMemo(() => listDeliveryRows(state), [state]);
  const stopCounts = useMemo(() => getVehicleStopCounts(state), [state]);
  const outstandingRows = useMemo(() => buildOutstandingRows(state), [state]);
  const paymentToday = useMemo(
    () => state.payments.filter((payment) => payment.paymentDate === dashboard.today),
    [dashboard.today, state.payments],
  );

  const currentVehicle =
    state.vehicles.find((vehicle) => vehicle.driverId === driverId) ?? state.vehicles[0];
  const driverStops = deliveryRows.filter((row) => row.vehicleId === currentVehicle?.id);

  const roleStats = [
    {
      label: "Vehicles Active",
      value: dashboard.totalVehiclesActive.toString(),
      detail: `${state.vehicles.length} vehicles in fleet`,
      icon: Truck,
    },
    {
      label: "Deliveries Today",
      value: dashboard.totalDeliveriesToday.toString(),
      detail: `${dashboard.completedToday} marked completed`,
      icon: PackageCheck,
    },
    {
      label: "Payments Today",
      value: formatCurrency(dashboard.totalPaymentsCollectedToday),
      detail: `${paymentToday.length} collections captured`,
      icon: Wallet,
    },
    {
      label: "Outstanding",
      value: formatCurrency(dashboard.totalOutstandingPayments),
      detail: `${outstandingRows.length} invoices pending`,
      icon: AlertCircle,
    },
  ];

  const deliveryChartData = state.vehicles.map((vehicle) => ({
    name: vehicle.vehicleNumber,
    stops: stopCounts[vehicle.id] ?? 0,
  }));

  const paymentMethodData = paymentMethods.map((method) => ({
    name: method,
    value: state.payments
      .filter((payment) => payment.paymentMethod === method)
      .reduce((sum, payment) => sum + payment.amountReceived, 0),
  }));

  const handleVehicleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const vehicle = {
      id: `veh-${crypto.randomUUID()}`,
      vehicleNumber: vehicleForm.vehicleNumber,
      driverName: vehicleForm.driverName,
      driverPhone: vehicleForm.driverPhone,
      status: vehicleForm.status,
      driverId: `drv-${crypto.randomUUID()}`,
    };

    setState((current) => ({
      ...current,
      vehicles: [...current.vehicles, vehicle],
    }));

    setVehicleForm({
      vehicleNumber: "",
      driverName: "",
      driverPhone: "",
      status: "Active",
    });
  };

  const handleDeliverySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setState((current) =>
      createDeliveryRecord(current, {
        vehicleId: deliveryForm.vehicleId,
        customerId: deliveryForm.customerId,
        location: deliveryForm.location,
        arrivalTime: deliveryForm.arrivalTime,
        departureTime: deliveryForm.departureTime,
        deliveryStatus: deliveryForm.deliveryStatus,
        goods: [
          {
            productName: deliveryForm.productName,
            quantity: Number(deliveryForm.quantity),
            deliveryDate: deliveryForm.deliveryDate,
          },
        ],
        invoiceReference: deliveryForm.invoiceReference,
        invoiceAmount: Number(deliveryForm.invoiceAmount),
        invoiceDate: deliveryForm.invoiceDate,
        payment:
          Number(deliveryForm.amountReceived) > 0
            ? {
                paymentMethod: deliveryForm.paymentMethod,
                amountReceived: Number(deliveryForm.amountReceived),
                paymentDate: deliveryForm.paymentDate,
              }
            : null,
        credit:
          Number(deliveryForm.creditAmount) > 0
            ? {
                creditAmount: Number(deliveryForm.creditAmount),
                reason: deliveryForm.creditReason,
              }
            : null,
        proof:
          deliveryForm.proofImage && deliveryForm.proofName
            ? {
                fileName: deliveryForm.proofName,
                imageDataUrl: deliveryForm.proofImage,
              }
            : null,
      }),
    );

    setDeliveryForm((current) => ({
      ...current,
      invoiceReference: `INV-2026-${Math.floor(1000 + Math.random() * 8000)}`,
      amountReceived: "",
      creditAmount: "",
      creditReason: "",
      proofName: "",
      proofImage: "",
    }));
  };

  const handleProofUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setDeliveryForm((current) => ({
        ...current,
        proofName: file.name,
        proofImage: String(reader.result),
      }));
    };
    reader.readAsDataURL(file);
  };

  const exportCsv = (fileName: string, rows: Record<string, string | number>[]) => {
    const csv = exportRowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,201,93,0.25),_transparent_28%),linear-gradient(180deg,_#f6f7f2_0%,_#eef4ef_35%,_#f9faf7_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[36px] border border-white/60 bg-[linear-gradient(135deg,_rgba(18,53,36,0.98),_rgba(62,123,85,0.93))] text-white shadow-[0_24px_80px_rgba(18,53,36,0.18)]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_0.9fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-50">
                <Truck className="h-4 w-4" />
                Delivery Tracker
              </div>
              <h1 className="mt-5 max-w-2xl font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Logistics visibility for routes, collections, credit notes, and outstanding balances.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-emerald-50/85 sm:text-lg">
                Built for dispatch teams, drivers, and finance teams that need one live view of
                deliveries without generating invoices inside the system.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {roleOrder.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => navigate(`/${item}`)}
                    className={`${buttonClass} ${
                      role === item
                        ? "bg-white text-emerald-950"
                        : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {roleTitles[item]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-white/10 bg-black/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-50/70">Current Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold">{roleTitles[role]}</h2>
                <p className="mt-2 text-sm text-emerald-50/80">{roleDescriptions[role]}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-50/65">Proof Uploads</p>
                  <p className="mt-2 text-2xl font-semibold">{state.deliveryProofs.length}</p>
                  <p className="mt-1 text-sm text-emerald-50/75">Images linked to completed stops</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-50/65">Ledger Health</p>
                  <p className="mt-2 text-2xl font-semibold">{ledgerRows.length}</p>
                  <p className="mt-1 text-sm text-emerald-50/75">Customers with tracked balances</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mt-8 space-y-8">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roleStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
            <SectionCard
              title="Fleet Activity"
              description="Delivery stops completed per vehicle to help dispatchers spot overloaded routes."
              action={
                <button
                  type="button"
                  onClick={() =>
                    exportCsv(
                      "vehicle-delivery-report.csv",
                      deliveryChartData.map((item) => ({
                        vehicle_number: item.name,
                        total_stops: item.stops,
                      })),
                    )
                  }
                  className={`${buttonClass} bg-emerald-950 text-white hover:bg-emerald-900`}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Vehicle Report
                </button>
              }
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="stops" fill="#123524" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Collection Mix"
              description="Breakdown of cash and non-cash collections recorded against invoice references."
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData.filter((item) => item.value > 0)}
                      innerRadius={60}
                      outerRadius={105}
                      dataKey="value"
                      nameKey="name"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={entry.name} fill={palette[index % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </section>

          {role === "admin" && (
            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
              <SectionCard
                title="Vehicle & Driver Management"
                description="Maintain fleet assignment records and vehicle availability."
              >
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="pb-3">Vehicle</th>
                          <th className="pb-3">Driver</th>
                          <th className="pb-3">Phone</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.vehicles.map((vehicle) => (
                          <tr key={vehicle.id} className="border-t border-slate-200/80">
                            <td className="py-3 font-medium text-slate-900">{vehicle.vehicleNumber}</td>
                            <td className="py-3">{vehicle.driverName}</td>
                            <td className="py-3">{vehicle.driverPhone}</td>
                            <td className="py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getVehicleStatusTone(
                                  vehicle.status,
                                )}`}
                              >
                                {vehicle.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleVehicleSubmit} className="space-y-3 rounded-[28px] bg-slate-50 p-4">
                    <h3 className="text-lg font-semibold text-slate-900">Add Vehicle</h3>
                    <input
                      required
                      value={vehicleForm.vehicleNumber}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, vehicleNumber: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      placeholder="Vehicle number"
                    />
                    <input
                      required
                      value={vehicleForm.driverName}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, driverName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      placeholder="Driver name"
                    />
                    <input
                      required
                      value={vehicleForm.driverPhone}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, driverPhone: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      placeholder="Driver phone"
                    />
                    <select
                      value={vehicleForm.status}
                      onChange={(event) =>
                        setVehicleForm((current) => ({ ...current, status: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <option>Active</option>
                      <option>In Service</option>
                      <option>Maintenance</option>
                    </select>
                    <button type="submit" className={`${buttonClass} w-full bg-emerald-950 text-white`}>
                      Save Vehicle
                    </button>
                  </form>
                </div>
              </SectionCard>

              <SectionCard
                title="All Deliveries"
                description="Central view of stops, invoice references, credits, and proof uploads."
              >
                <div className="max-h-[28rem] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white text-slate-500">
                      <tr>
                        <th className="pb-3">Vehicle</th>
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Invoice Ref</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Received</th>
                        <th className="pb-3">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryRows.map((row) => (
                        <tr key={row.stopId} className="border-t border-slate-200/80">
                          <td className="py-3 font-medium text-slate-900">{row.vehicleNumber}</td>
                          <td className="py-3">{row.customerName}</td>
                          <td className="py-3">{row.invoiceReference}</td>
                          <td className="py-3">{formatCurrency(row.invoiceAmount)}</td>
                          <td className="py-3">{formatCurrency(row.amountReceived)}</td>
                          <td className="py-3 text-amber-700">{formatCurrency(row.outstandingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          )}

          {role === "driver" && (
            <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
              <SectionCard
                title="Assigned Vehicle"
                description="Driver-specific route context with recent stops and proof previews."
                action={
                  <select
                    value={driverId}
                    onChange={(event) => setDriverId(event.target.value as DriverRole)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
                  >
                    {state.vehicles.map((vehicle) => (
                      <option key={vehicle.driverId} value={vehicle.driverId}>
                        {vehicle.driverName}
                      </option>
                    ))}
                  </select>
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Vehicle</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {currentVehicle?.vehicleNumber}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{currentVehicle?.driverName}</p>
                    <p className="mt-1 text-sm text-slate-600">{currentVehicle?.driverPhone}</p>
                  </div>
                  <div className="rounded-[28px] bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stop Summary</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{driverStops.length}</p>
                    <p className="mt-2 text-sm text-slate-600">Stops tied to this vehicle</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Outstanding:{" "}
                      {formatCurrency(
                        driverStops.reduce((sum, row) => sum + row.outstandingBalance, 0),
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {driverStops.slice(0, 4).map((row) => (
                    <div
                      key={row.stopId}
                      className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-950">{row.customerName}</p>
                          <p className="mt-1 text-sm text-slate-600">{row.location}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {row.deliveryStatus}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                        <span>Invoice {row.invoiceReference}</span>
                        <span>Collected {formatCurrency(row.amountReceived)}</span>
                        <span>Credit {formatCurrency(row.creditAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Create Delivery Entry"
                description="Record delivery stops, goods, invoice references, collections, credit, and proof image."
              >
                <form onSubmit={handleDeliverySubmit} className="grid gap-4 md:grid-cols-2">
                  <select
                    value={deliveryForm.vehicleId}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, vehicleId: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    {state.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNumber}
                      </option>
                    ))}
                  </select>
                  <select
                    value={deliveryForm.customerId}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, customerId: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    {state.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                  <input
                    value={deliveryForm.location}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, location: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2"
                    placeholder="Stop location"
                  />
                  <input
                    value={deliveryForm.productName}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, productName: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    placeholder="Product name"
                  />
                  <input
                    type="number"
                    min="1"
                    value={deliveryForm.quantity}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    placeholder="Quantity"
                  />
                  <input
                    value={deliveryForm.invoiceReference}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, invoiceReference: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    placeholder="Invoice reference"
                  />
                  <input
                    type="number"
                    min="0"
                    value={deliveryForm.invoiceAmount}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, invoiceAmount: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    placeholder="Invoice amount"
                  />
                  <select
                    value={deliveryForm.paymentMethod}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({
                        ...current,
                        paymentMethod: event.target.value as PaymentMethod,
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={deliveryForm.amountReceived}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, amountReceived: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    placeholder="Payment received"
                  />
                  <input
                    type="number"
                    min="0"
                    value={deliveryForm.creditAmount}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, creditAmount: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    placeholder="Credit used"
                  />
                  <input
                    value={deliveryForm.creditReason}
                    onChange={(event) =>
                      setDeliveryForm((current) => ({ ...current, creditReason: event.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    placeholder="Credit reason"
                  />
                  <div className="grid gap-3 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3">
                      <Camera className="h-4 w-4 text-emerald-700" />
                      <span className="text-sm font-medium text-slate-700">
                        {deliveryForm.proofName || "Upload delivery proof image"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                    </label>
                    {deliveryForm.proofImage && (
                      <img
                        src={deliveryForm.proofImage}
                        alt="Delivery proof preview"
                        className="h-44 w-full rounded-[24px] object-cover"
                      />
                    )}
                  </div>
                  <button type="submit" className={`${buttonClass} md:col-span-2 bg-emerald-950 text-white`}>
                    Save Delivery Entry
                  </button>
                </form>
              </SectionCard>
            </div>
          )}

          {role === "finance" && (
            <div className="space-y-8">
              <div className="grid gap-8 xl:grid-cols-2">
                <SectionCard
                  title="Payment Collection Report"
                  description="All collections posted against external invoice references."
                  action={
                    <button
                      type="button"
                      onClick={() =>
                        exportCsv(
                          "payment-collection-report.csv",
                          state.payments.map((payment) => ({
                            invoice_id: payment.invoiceId,
                            payment_method: payment.paymentMethod,
                            amount_received: payment.amountReceived,
                            payment_date: payment.paymentDate,
                          })),
                        )
                      }
                      className={`${buttonClass} bg-emerald-950 text-white`}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Collections
                    </button>
                  }
                >
                  <div className="max-h-[28rem] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white text-slate-500">
                        <tr>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Invoice</th>
                          <th className="pb-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.payments.map((payment) => {
                          const invoice = state.invoiceReferences.find((item) => item.id === payment.invoiceId);
                          return (
                            <tr key={payment.id} className="border-t border-slate-200/80">
                              <td className="py-3">{payment.paymentDate}</td>
                              <td className="py-3">{payment.paymentMethod}</td>
                              <td className="py-3">{invoice?.invoiceReference}</td>
                              <td className="py-3 font-medium text-slate-900">
                                {formatCurrency(payment.amountReceived)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Outstanding Payment Report"
                  description="Track open invoice references after collections and credit adjustments."
                  action={
                    <button
                      type="button"
                      onClick={() =>
                        exportCsv(
                          "outstanding-payments.csv",
                          outstandingRows.map((row) => ({
                            customer_name: row.customerName,
                            invoice_reference: row.invoiceReference,
                            invoice_amount: row.invoiceAmount,
                            paid_amount: row.amountPaid,
                            credit_amount: row.creditAmount,
                            outstanding_balance: row.outstandingBalance,
                          })),
                        )
                      }
                      className={`${buttonClass} bg-slate-900 text-white`}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Export Outstanding
                    </button>
                  }
                >
                  <div className="max-h-[28rem] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white text-slate-500">
                        <tr>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Invoice</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstandingRows.map((row) => (
                          <tr key={row.invoiceId} className="border-t border-slate-200/80">
                            <td className="py-3">{row.customerName}</td>
                            <td className="py-3">{row.invoiceReference}</td>
                            <td className="py-3">{formatCurrency(row.invoiceAmount)}</td>
                            <td className="py-3 font-medium text-amber-700">
                              {formatCurrency(row.outstandingBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title="Customer Ledger"
                description="Invoice totals, received payments, credit notes, and resulting balance for each customer."
                action={
                  <button
                    type="button"
                    onClick={() =>
                      exportCsv(
                        "customer-ledger.csv",
                        ledgerRows.map((row) => ({
                          customer_name:
                            state.customers.find((customer) => customer.id === row.customerId)?.customerName ??
                            row.customerId,
                          total_invoice: row.totalInvoice,
                          total_paid: row.totalPaid,
                          credit_amount: row.creditAmount,
                          outstanding_balance: row.outstandingBalance,
                        })),
                      )
                    }
                    className={`${buttonClass} bg-emerald-950 text-white`}
                  >
                    <Banknote className="mr-2 h-4 w-4" />
                    Export Ledger
                  </button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Invoice Total</th>
                        <th className="pb-3">Paid</th>
                        <th className="pb-3">Credit</th>
                        <th className="pb-3">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map((row) => {
                        const customer = state.customers.find((item) => item.id === row.customerId);
                        return (
                          <tr key={row.id} className="border-t border-slate-200/80">
                            <td className="py-3 font-medium text-slate-900">{customer?.customerName}</td>
                            <td className="py-3">{formatCurrency(row.totalInvoice)}</td>
                            <td className="py-3">{formatCurrency(row.totalPaid)}</td>
                            <td className="py-3">{formatCurrency(row.creditAmount)}</td>
                            <td className="py-3 font-medium text-amber-700">
                              {formatCurrency(row.outstandingBalance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          )}

          <section className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-[28px] border border-white/60 bg-white/90 p-5">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-emerald-700" />
                <h3 className="text-lg font-semibold text-slate-950">Future Ready</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                App structure leaves room for GPS vehicle telemetry, WhatsApp proof notifications, and
                accounting integrations later.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/90 p-5">
              <div className="flex items-center gap-3">
                <PackageCheck className="h-5 w-5 text-emerald-700" />
                <h3 className="text-lg font-semibold text-slate-950">No Invoice Generation</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                The system stores only invoice reference numbers and payment details coming from external
                accounting systems.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/90 p-5">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-emerald-700" />
                <h3 className="text-lg font-semibold text-slate-950">Outstanding Logic</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Outstanding = Invoice Amount - Payments Received - Credit Notes, recalculated for each
                invoice and customer ledger row.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;
