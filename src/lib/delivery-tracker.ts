export type Role = "admin" | "driver" | "finance";
export type DriverRole = "drv-001" | "drv-002" | "drv-003" | string;
export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Card" | "Credit";

export type Vehicle = {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: string;
  driverId: DriverRole;
};

export type Customer = {
  id: string;
  customerName: string;
  location: string;
  phone: string;
};

export type DeliveryStop = {
  id: string;
  vehicleId: string;
  customerId: string;
  location: string;
  arrivalTime: string;
  departureTime: string;
  deliveryStatus: string;
};

export type GoodsDelivered = {
  id: string;
  stopId: string;
  productName: string;
  quantity: number;
  deliveryDate: string;
};

export type InvoiceReference = {
  id: string;
  stopId: string;
  invoiceReference: string;
  invoiceAmount: number;
  invoiceDate: string;
  paymentStatus: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  paymentDate: string;
};

export type CreditNote = {
  id: string;
  invoiceId: string;
  creditAmount: number;
  reason: string;
};

export type CustomerLedger = {
  id: string;
  customerId: string;
  totalInvoice: number;
  totalPaid: number;
  creditAmount: number;
  outstandingBalance: number;
};

export type DeliveryProof = {
  id: string;
  stopId: string;
  fileName: string;
  imageDataUrl: string;
};

export type AppUser = {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  email?: string;
  authUserId?: string;
};

export type DeliveryTrackerState = {
  vehicles: Vehicle[];
  customers: Customer[];
  deliveryStops: DeliveryStop[];
  goodsDelivered: GoodsDelivered[];
  invoiceReferences: InvoiceReference[];
  payments: Payment[];
  creditNotes: CreditNote[];
  customerLedger: CustomerLedger[];
  deliveryProofs: DeliveryProof[];
  appUsers: AppUser[];
};

export type DeliveryTrackerStateBase = Omit<DeliveryTrackerState, "customerLedger">;

export type DeliveryInput = {
  vehicleId: string;
  customerId: string;
  location: string;
  arrivalTime: string;
  departureTime: string;
  deliveryStatus: string;
  goods: Array<{
    productName: string;
    quantity: number;
    deliveryDate: string;
  }>;
  invoiceReference: string;
  invoiceAmount: number;
  invoiceDate: string;
  payment: {
    paymentMethod: PaymentMethod;
    amountReceived: number;
    paymentDate: string;
  } | null;
  credit: {
    creditAmount: number;
    reason: string;
  } | null;
  proof: {
    fileName: string;
    imageDataUrl: string;
  } | null;
};

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const sumBy = <T>(items: T[], getValue: (item: T) => number) =>
  items.reduce((sum, item) => sum + getValue(item), 0);

export const buildCustomerLedger = (state: DeliveryTrackerStateBase): CustomerLedger[] =>
  state.customers.map((customer) => {
    const customerStopIds = state.deliveryStops
      .filter((stop) => stop.customerId === customer.id)
      .map((stop) => stop.id);

    const invoices = state.invoiceReferences.filter((invoice) => customerStopIds.includes(invoice.stopId));
    const invoiceIds = invoices.map((invoice) => invoice.id);
    const totalInvoice = sumBy(invoices, (invoice) => invoice.invoiceAmount);
    const totalPaid = sumBy(
      state.payments.filter((payment) => invoiceIds.includes(payment.invoiceId)),
      (payment) => payment.amountReceived,
    );
    const creditAmount = sumBy(
      state.creditNotes.filter((credit) => invoiceIds.includes(credit.invoiceId)),
      (credit) => credit.creditAmount,
    );

    return {
      id: `ledger-${customer.id}`,
      customerId: customer.id,
      totalInvoice,
      totalPaid,
      creditAmount,
      outstandingBalance: Math.max(totalInvoice - totalPaid - creditAmount, 0),
    };
  });

export const syncInvoiceStatuses = (
  invoices: InvoiceReference[],
  payments: Payment[],
  credits: CreditNote[],
): InvoiceReference[] =>
  invoices.map((invoice) => {
    const outstanding = calculateInvoiceOutstanding(invoice.id, invoices, payments, credits);
    return {
      ...invoice,
      paymentStatus: outstanding === 0 ? "Paid" : outstanding < invoice.invoiceAmount ? "Partially Paid" : "Pending",
    };
  });

export const createSeedState = (): DeliveryTrackerState => {
  const vehicles: Vehicle[] = [
    {
      id: "veh-001",
      vehicleNumber: "KA01AB1420",
      driverName: "Rajesh Kumar",
      driverPhone: "+91 98450 11001",
      status: "Active",
      driverId: "drv-001",
    },
    {
      id: "veh-002",
      vehicleNumber: "KA05MX2844",
      driverName: "Asha R",
      driverPhone: "+91 98450 11002",
      status: "In Service",
      driverId: "drv-002",
    },
    {
      id: "veh-003",
      vehicleNumber: "KA03TR9910",
      driverName: "Imran Khan",
      driverPhone: "+91 98450 11003",
      status: "Active",
      driverId: "drv-003",
    },
  ];

  const customers: Customer[] = [
    { id: "cust-001", customerName: "Metro Retail", location: "Bengaluru CBD", phone: "+91 99801 12345" },
    { id: "cust-002", customerName: "Fresh Basket", location: "Indiranagar", phone: "+91 99802 22345" },
    { id: "cust-003", customerName: "City Pharma", location: "Koramangala", phone: "+91 99803 32345" },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const deliveryStops: DeliveryStop[] = [
    {
      id: "stop-001",
      vehicleId: "veh-001",
      customerId: "cust-001",
      location: "MG Road, Bengaluru",
      arrivalTime: "09:10",
      departureTime: "09:30",
      deliveryStatus: "Delivered",
    },
    {
      id: "stop-002",
      vehicleId: "veh-002",
      customerId: "cust-002",
      location: "100 Feet Road, Indiranagar",
      arrivalTime: "10:00",
      departureTime: "10:18",
      deliveryStatus: "Delivered",
    },
    {
      id: "stop-003",
      vehicleId: "veh-003",
      customerId: "cust-003",
      location: "80 Feet Road, Koramangala",
      arrivalTime: "11:05",
      departureTime: "11:22",
      deliveryStatus: "Partially Delivered",
    },
  ];

  const goodsDelivered: GoodsDelivered[] = [
    { id: "good-001", stopId: "stop-001", productName: "Beverage Crate", quantity: 24, deliveryDate: today },
    { id: "good-002", stopId: "stop-002", productName: "Produce Box", quantity: 32, deliveryDate: today },
    { id: "good-003", stopId: "stop-003", productName: "Medical Supply Case", quantity: 12, deliveryDate: today },
  ];

  const invoiceReferences: InvoiceReference[] = [
    {
      id: "inv-001",
      stopId: "stop-001",
      invoiceReference: "INV-EXT-1001",
      invoiceAmount: 25000,
      invoiceDate: today,
      paymentStatus: "Partially Paid",
    },
    {
      id: "inv-002",
      stopId: "stop-002",
      invoiceReference: "INV-EXT-1002",
      invoiceAmount: 18000,
      invoiceDate: today,
      paymentStatus: "Paid",
    },
    {
      id: "inv-003",
      stopId: "stop-003",
      invoiceReference: "INV-EXT-1003",
      invoiceAmount: 22000,
      invoiceDate: today,
      paymentStatus: "Pending",
    },
  ];

  const payments: Payment[] = [
    { id: "pay-001", invoiceId: "inv-001", paymentMethod: "UPI", amountReceived: 12000, paymentDate: today },
    { id: "pay-002", invoiceId: "inv-002", paymentMethod: "Bank Transfer", amountReceived: 18000, paymentDate: today },
  ];

  const creditNotes: CreditNote[] = [
    { id: "cred-001", invoiceId: "inv-001", creditAmount: 1000, reason: "Bottle damage" },
  ];

  const deliveryProofs: DeliveryProof[] = [
    {
      id: "proof-001",
      stopId: "stop-001",
      fileName: "metro-retail-proof.jpg",
      imageDataUrl:
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><rect width='800' height='500' fill='%23123524'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='38' fill='white'>Delivery Proof</text></svg>",
    },
  ];

  const appUsers: AppUser[] = [
    {
      id: "user-001",
      fullName: "Demo Admin",
      phone: "+91 90000 10001",
      role: "admin",
      email: "admin@deliverytracker.local",
    },
    {
      id: "user-002",
      fullName: "Rajesh Kumar",
      phone: "+91 98450 11001",
      role: "driver",
      email: "driver@deliverytracker.local",
    },
    {
      id: "user-003",
      fullName: "Priya Finance",
      phone: "+91 90000 10003",
      role: "finance",
      email: "finance@deliverytracker.local",
    },
  ];

  const customerLedger = buildCustomerLedger({
    vehicles,
    customers,
    deliveryStops,
    goodsDelivered,
    invoiceReferences,
    payments,
    creditNotes,
    deliveryProofs,
    appUsers,
  });

  return {
    vehicles,
    customers,
    deliveryStops,
    goodsDelivered,
    invoiceReferences: syncInvoiceStatuses(invoiceReferences, payments, creditNotes),
    payments,
    creditNotes,
    customerLedger,
    deliveryProofs,
    appUsers,
  };
};

export const finalizeDeliveryTrackerState = (state: DeliveryTrackerStateBase): DeliveryTrackerState => {
  const invoiceReferences = syncInvoiceStatuses(
    state.invoiceReferences,
    state.payments,
    state.creditNotes,
  );

  return {
    ...state,
    invoiceReferences,
    customerLedger: buildCustomerLedger({
      ...state,
      invoiceReferences,
    }),
  };
};

export const calculateInvoiceOutstanding = (
  invoiceId: string,
  invoices: InvoiceReference[],
  payments: Payment[],
  credits: CreditNote[],
) => {
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) return 0;

  const paid = sumBy(
    payments.filter((payment) => payment.invoiceId === invoiceId),
    (payment) => payment.amountReceived,
  );
  const credited = sumBy(
    credits.filter((credit) => credit.invoiceId === invoiceId),
    (credit) => credit.creditAmount,
  );

  return Math.max(invoice.invoiceAmount - paid - credited, 0);
};

export const createDeliveryRecord = (
  state: DeliveryTrackerState,
  input: DeliveryInput,
): DeliveryTrackerState => {
  const stopId = makeId("stop");
  const invoiceId = makeId("inv");
  const stop: DeliveryStop = {
    id: stopId,
    vehicleId: input.vehicleId,
    customerId: input.customerId,
    location: input.location,
    arrivalTime: input.arrivalTime,
    departureTime: input.departureTime,
    deliveryStatus: input.deliveryStatus,
  };

  const goods = input.goods.map((item) => ({
    id: makeId("good"),
    stopId,
    productName: item.productName,
    quantity: item.quantity,
    deliveryDate: item.deliveryDate,
  }));

  const invoice: InvoiceReference = {
    id: invoiceId,
    stopId,
    invoiceReference: input.invoiceReference,
    invoiceAmount: input.invoiceAmount,
    invoiceDate: input.invoiceDate,
    paymentStatus: "Pending",
  };

  const payments = input.payment
    ? [
        ...state.payments,
        {
          id: makeId("pay"),
          invoiceId,
          paymentMethod: input.payment.paymentMethod,
          amountReceived: input.payment.amountReceived,
          paymentDate: input.payment.paymentDate,
        },
      ]
    : state.payments;

  const credits = input.credit
    ? [
        ...state.creditNotes,
        {
          id: makeId("cred"),
          invoiceId,
          creditAmount: input.credit.creditAmount,
          reason: input.credit.reason,
        },
      ]
    : state.creditNotes;

  const proofs = input.proof
    ? [
        ...state.deliveryProofs,
        {
          id: makeId("proof"),
          stopId,
          fileName: input.proof.fileName,
          imageDataUrl: input.proof.imageDataUrl,
        },
      ]
    : state.deliveryProofs;

  const nextStateBase: DeliveryTrackerStateBase = {
    ...state,
    deliveryStops: [...state.deliveryStops, stop],
    goodsDelivered: [...state.goodsDelivered, ...goods],
    invoiceReferences: [...state.invoiceReferences, invoice],
    payments,
    creditNotes: credits,
    deliveryProofs: proofs,
    appUsers: state.appUsers,
  };

  return finalizeDeliveryTrackerState(nextStateBase);
};

export const buildDashboardMetrics = (state: DeliveryTrackerState) => {
  const today = new Date().toISOString().slice(0, 10);
  const deliveriesToday = state.goodsDelivered.filter((good) => good.deliveryDate === today);
  const completedToday = state.deliveryStops.filter((stop) => stop.deliveryStatus === "Delivered").length;
  const totalPaymentsCollectedToday = sumBy(
    state.payments.filter((payment) => payment.paymentDate === today),
    (payment) => payment.amountReceived,
  );
  const totalOutstandingPayments = sumBy(state.customerLedger, (row) => row.outstandingBalance);

  return {
    today,
    totalVehiclesActive: state.vehicles.filter((vehicle) => vehicle.status === "Active").length,
    totalDeliveriesToday: deliveriesToday.length,
    completedToday,
    totalPaymentsCollectedToday,
    totalOutstandingPayments,
  };
};

export const buildOutstandingRows = (state: DeliveryTrackerState) =>
  state.invoiceReferences
    .map((invoice) => {
      const stop = state.deliveryStops.find((item) => item.id === invoice.stopId);
      const customer = state.customers.find((item) => item.id === stop?.customerId);
      const amountPaid = sumBy(
        state.payments.filter((payment) => payment.invoiceId === invoice.id),
        (payment) => payment.amountReceived,
      );
      const creditAmount = sumBy(
        state.creditNotes.filter((credit) => credit.invoiceId === invoice.id),
        (credit) => credit.creditAmount,
      );
      const outstandingBalance = calculateInvoiceOutstanding(
        invoice.id,
        state.invoiceReferences,
        state.payments,
        state.creditNotes,
      );

      return {
        invoiceId: invoice.id,
        invoiceReference: invoice.invoiceReference,
        customerName: customer?.customerName ?? "Unknown Customer",
        invoiceAmount: invoice.invoiceAmount,
        amountPaid,
        creditAmount,
        outstandingBalance,
      };
    })
    .filter((row) => row.outstandingBalance > 0);

export const listDeliveryRows = (state: DeliveryTrackerState) =>
  state.deliveryStops.map((stop) => {
    const vehicle = state.vehicles.find((item) => item.id === stop.vehicleId);
    const customer = state.customers.find((item) => item.id === stop.customerId);
    const invoice = state.invoiceReferences.find((item) => item.stopId === stop.id);
    const amountReceived = sumBy(
      state.payments.filter((payment) => payment.invoiceId === invoice?.id),
      (payment) => payment.amountReceived,
    );
    const creditAmount = sumBy(
      state.creditNotes.filter((credit) => credit.invoiceId === invoice?.id),
      (credit) => credit.creditAmount,
    );

    return {
      stopId: stop.id,
      vehicleId: stop.vehicleId,
      vehicleNumber: vehicle?.vehicleNumber ?? "Unassigned",
      customerName: customer?.customerName ?? "Unknown Customer",
      location: stop.location,
      deliveryStatus: stop.deliveryStatus,
      invoiceReference: invoice?.invoiceReference ?? "Pending",
      invoiceAmount: invoice?.invoiceAmount ?? 0,
      amountReceived,
      creditAmount,
      outstandingBalance: invoice
        ? calculateInvoiceOutstanding(
            invoice.id,
            state.invoiceReferences,
            state.payments,
            state.creditNotes,
          )
        : 0,
    };
  });

export const getVehicleStopCounts = (state: DeliveryTrackerState) =>
  state.deliveryStops.reduce<Record<string, number>>((accumulator, stop) => {
    accumulator[stop.vehicleId] = (accumulator[stop.vehicleId] ?? 0) + 1;
    return accumulator;
  }, {});

export const getVehicleStatusTone = (status: string) => {
  if (status === "Active") return "bg-emerald-50 text-emerald-700";
  if (status === "In Service") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

export const exportRowsToCsv = (rows: Record<string, string | number>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];
  return lines.join("\n");
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const updateVehicleRecord = (
  state: DeliveryTrackerState,
  vehicleId: string,
  updates: Omit<Vehicle, "id">,
) => ({
  ...state,
  vehicles: state.vehicles.map((vehicle) =>
    vehicle.id === vehicleId ? { id: vehicle.id, ...updates } : vehicle,
  ),
});

export const deleteVehicleRecord = (state: DeliveryTrackerState, vehicleId: string) => {
  if (state.deliveryStops.some((stop) => stop.vehicleId === vehicleId)) {
    throw new Error("This vehicle is already linked to delivery stops and cannot be deleted.");
  }

  return {
    ...state,
    vehicles: state.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
  };
};

export const updateCustomerRecord = (
  state: DeliveryTrackerState,
  customerId: string,
  updates: Omit<Customer, "id">,
) => ({
  ...state,
  customers: state.customers.map((customer) =>
    customer.id === customerId ? { id: customer.id, ...updates } : customer,
  ),
});

export const deleteCustomerRecord = (state: DeliveryTrackerState, customerId: string) => {
  if (state.deliveryStops.some((stop) => stop.customerId === customerId)) {
    throw new Error("This customer is already linked to delivery stops and cannot be deleted.");
  }

  return finalizeDeliveryTrackerState({
    ...state,
    customers: state.customers.filter((customer) => customer.id !== customerId),
    vehicles: state.vehicles,
    deliveryStops: state.deliveryStops,
    goodsDelivered: state.goodsDelivered,
    invoiceReferences: state.invoiceReferences,
    payments: state.payments,
    creditNotes: state.creditNotes,
    deliveryProofs: state.deliveryProofs,
    appUsers: state.appUsers,
  });
};

export const createManualPaymentRecord = (
  state: DeliveryTrackerState,
  input: {
    invoiceId: string;
    paymentMethod: PaymentMethod;
    amountReceived: number;
    paymentDate: string;
  },
) =>
  finalizeDeliveryTrackerState({
    ...state,
    vehicles: state.vehicles,
    customers: state.customers,
    deliveryStops: state.deliveryStops,
    goodsDelivered: state.goodsDelivered,
    invoiceReferences: state.invoiceReferences,
    payments: [
      ...state.payments,
      {
        id: makeId("pay"),
        invoiceId: input.invoiceId,
        paymentMethod: input.paymentMethod,
        amountReceived: input.amountReceived,
        paymentDate: input.paymentDate,
      },
    ],
    creditNotes: state.creditNotes,
    deliveryProofs: state.deliveryProofs,
    appUsers: state.appUsers,
  });

export const updateDeliveryStopRecord = (
  state: DeliveryTrackerState,
  input: {
    stopId: string;
    location: string;
    arrivalTime: string;
    departureTime: string;
    deliveryStatus: string;
  },
) =>
  finalizeDeliveryTrackerState({
    ...state,
    vehicles: state.vehicles,
    customers: state.customers,
    deliveryStops: state.deliveryStops.map((stop) =>
      stop.id === input.stopId
        ? {
            ...stop,
            location: input.location,
            arrivalTime: input.arrivalTime,
            departureTime: input.departureTime,
            deliveryStatus: input.deliveryStatus,
          }
        : stop,
    ),
    goodsDelivered: state.goodsDelivered,
    invoiceReferences: state.invoiceReferences,
    payments: state.payments,
    creditNotes: state.creditNotes,
    deliveryProofs: state.deliveryProofs,
    appUsers: state.appUsers,
  });

export const createAppUserRecord = (
  state: DeliveryTrackerState,
  input: Omit<AppUser, "id">,
) => ({
  ...state,
  appUsers: [
    ...state.appUsers,
    {
      id: makeId("user"),
      ...input,
    },
  ],
});
