import {
  AppUser,
  Customer,
  DeliveryInput,
  DeliveryTrackerState,
  DeliveryTrackerStateBase,
  Vehicle,
  finalizeDeliveryTrackerState,
} from "@/lib/delivery-tracker";
import { supabase } from "@/lib/supabase";

type TableError = {
  message: string;
};

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  return supabase;
};

const assertNoError = (error: TableError | null) => {
  if (error) {
    throw new Error(error.message);
  }
};

const uploadProofImage = async (stopId: string, fileName: string, imageDataUrl: string) => {
  const client = ensureSupabase();
  const [, base64Data = ""] = imageDataUrl.split(",");
  const mimeMatch = imageDataUrl.match(/^data:(.*?);base64,/);
  const contentType = mimeMatch?.[1] ?? "image/jpeg";
  const decoded = atob(base64Data);
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));

  const storagePath = `${stopId}/${Date.now()}-${fileName}`;
  const { error } = await client.storage
    .from("delivery-proofs")
    .upload(storagePath, bytes, { contentType, upsert: true });

  assertNoError(error);
  return storagePath;
};

export const loadDeliveryTrackerStateFromSupabase = async (): Promise<DeliveryTrackerState> => {
  const client = ensureSupabase();

  const [
    vehiclesResult,
    customersResult,
    stopsResult,
    goodsResult,
    invoicesResult,
    paymentsResult,
    creditsResult,
    proofsResult,
    usersResult,
  ] = await Promise.all([
    client.from("vehicles").select("*").order("created_at", { ascending: true }),
    client.from("customers").select("*").order("created_at", { ascending: true }),
    client.from("delivery_stops").select("*").order("created_at", { ascending: true }),
    client.from("goods_delivered").select("*").order("created_at", { ascending: true }),
    client.from("invoice_references").select("*").order("created_at", { ascending: true }),
    client.from("payments").select("*").order("payment_date", { ascending: true }),
    client.from("credit_notes").select("*").order("created_at", { ascending: true }),
    client.from("delivery_proofs").select("*").order("created_at", { ascending: true }),
    client.from("profiles").select("*").order("created_at", { ascending: true }),
  ]);

  [
    vehiclesResult.error,
    customersResult.error,
    stopsResult.error,
    goodsResult.error,
    invoicesResult.error,
    paymentsResult.error,
    creditsResult.error,
    proofsResult.error,
    usersResult.error,
  ].forEach((error) => assertNoError(error));

  const stateBase: DeliveryTrackerStateBase = {
    vehicles: (vehiclesResult.data ?? []).map((vehicle) => ({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicle_number,
      driverName: vehicle.driver_name,
      driverPhone: vehicle.driver_phone,
      status: vehicle.status,
      driverId: vehicle.driver_id ?? vehicle.id,
    })),
    customers: (customersResult.data ?? []).map((customer) => ({
      id: customer.id,
      customerName: customer.customer_name,
      location: customer.location,
      phone: customer.phone,
    })),
    deliveryStops: (stopsResult.data ?? []).map((stop) => ({
      id: stop.id,
      vehicleId: stop.vehicle_id,
      customerId: stop.customer_id,
      location: stop.location,
      arrivalTime: stop.arrival_time,
      departureTime: stop.departure_time,
      deliveryStatus: stop.delivery_status,
    })),
    goodsDelivered: (goodsResult.data ?? []).map((item) => ({
      id: item.id,
      stopId: item.stop_id,
      productName: item.product_name,
      quantity: item.quantity,
      deliveryDate: item.delivery_date,
    })),
    invoiceReferences: (invoicesResult.data ?? []).map((invoice) => ({
      id: invoice.id,
      stopId: invoice.stop_id,
      invoiceReference: invoice.invoice_reference,
      invoiceAmount: invoice.invoice_amount,
      invoiceDate: invoice.invoice_date,
      paymentStatus: invoice.payment_status,
    })),
    payments: (paymentsResult.data ?? []).map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      paymentMethod: payment.payment_method,
      amountReceived: payment.amount_received,
      paymentDate: payment.payment_date,
    })),
    creditNotes: (creditsResult.data ?? []).map((credit) => ({
      id: credit.id,
      invoiceId: credit.invoice_id,
      creditAmount: credit.credit_amount,
      reason: credit.reason,
    })),
    deliveryProofs: (proofsResult.data ?? []).map((proof) => ({
      id: proof.id,
      stopId: proof.stop_id,
      fileName: proof.file_name,
      imageDataUrl: proof.file_url,
    })),
    appUsers: (usersResult.data ?? []).map((user) => ({
      id: user.id,
      fullName: user.full_name,
      phone: user.phone ?? "",
      role: user.role,
      email: "",
      authUserId: user.id,
    })),
  };

  return finalizeDeliveryTrackerState(stateBase);
};

export const createVehicleInSupabase = async (
  vehicle: Omit<Vehicle, "id">,
): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client.from("vehicles").insert({
    vehicle_number: vehicle.vehicleNumber,
    driver_name: vehicle.driverName,
    driver_phone: vehicle.driverPhone,
    status: vehicle.status,
    driver_id: vehicle.driverId,
  });

  assertNoError(error);
};

export const updateVehicleInSupabase = async (
  vehicleId: string,
  vehicle: Omit<Vehicle, "id">,
): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from("vehicles")
    .update({
      vehicle_number: vehicle.vehicleNumber,
      driver_name: vehicle.driverName,
      driver_phone: vehicle.driverPhone,
      status: vehicle.status,
      driver_id: vehicle.driverId,
    })
    .eq("id", vehicleId);

  assertNoError(error);
};

export const deleteVehicleInSupabase = async (vehicleId: string): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client.from("vehicles").delete().eq("id", vehicleId);
  assertNoError(error);
};

export const createCustomerInSupabase = async (
  customer: Omit<Customer, "id">,
): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client.from("customers").insert({
    customer_name: customer.customerName,
    location: customer.location,
    phone: customer.phone,
  });

  assertNoError(error);
};

export const updateCustomerInSupabase = async (
  customerId: string,
  customer: Omit<Customer, "id">,
): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from("customers")
    .update({
      customer_name: customer.customerName,
      location: customer.location,
      phone: customer.phone,
    })
    .eq("id", customerId);

  assertNoError(error);
};

export const deleteCustomerInSupabase = async (customerId: string): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client.from("customers").delete().eq("id", customerId);
  assertNoError(error);
};

export const createAppUserInSupabase = async (
  user: Omit<AppUser, "id">,
): Promise<void> => {
  const client = ensureSupabase();

  if (!user.authUserId) {
    throw new Error("Supabase mode requires an Auth User ID to create a profile record.");
  }

  const { error } = await client.from("profiles").insert({
    id: user.authUserId,
    full_name: user.fullName,
    phone: user.phone,
    role: user.role,
  });

  assertNoError(error);
};

export const createManualPaymentInSupabase = async (input: {
  invoiceId: string;
  paymentMethod: string;
  amountReceived: number;
  paymentDate: string;
}): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client.from("payments").insert({
    invoice_id: input.invoiceId,
    payment_method: input.paymentMethod,
    amount_received: input.amountReceived,
    payment_date: input.paymentDate,
  });

  assertNoError(error);
};

export const updateDeliveryStopInSupabase = async (input: {
  stopId: string;
  location: string;
  arrivalTime: string;
  departureTime: string;
  deliveryStatus: string;
}): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from("delivery_stops")
    .update({
      location: input.location,
      arrival_time: input.arrivalTime,
      departure_time: input.departureTime,
      delivery_status: input.deliveryStatus,
    })
    .eq("id", input.stopId);

  assertNoError(error);
};

export const createDeliveryInSupabase = async (input: DeliveryInput): Promise<void> => {
  const client = ensureSupabase();

  const { data: stop, error: stopError } = await client
    .from("delivery_stops")
    .insert({
      vehicle_id: input.vehicleId,
      customer_id: input.customerId,
      location: input.location,
      arrival_time: input.arrivalTime,
      departure_time: input.departureTime,
      delivery_status: input.deliveryStatus,
    })
    .select("id")
    .single();
  assertNoError(stopError);

  const stopId = stop.id;

  if (input.goods.length) {
    const { error } = await client.from("goods_delivered").insert(
      input.goods.map((item) => ({
        stop_id: stopId,
        product_name: item.productName,
        quantity: item.quantity,
        delivery_date: item.deliveryDate,
      })),
    );
    assertNoError(error);
  }

  const { data: invoice, error: invoiceError } = await client
    .from("invoice_references")
    .insert({
      stop_id: stopId,
      invoice_reference: input.invoiceReference,
      invoice_amount: input.invoiceAmount,
      invoice_date: input.invoiceDate,
      payment_status: "Pending",
    })
    .select("id")
    .single();
  assertNoError(invoiceError);

  const invoiceId = invoice.id;

  if (input.payment) {
    const { error } = await client.from("payments").insert({
      invoice_id: invoiceId,
      payment_method: input.payment.paymentMethod,
      amount_received: input.payment.amountReceived,
      payment_date: input.payment.paymentDate,
    });
    assertNoError(error);
  }

  if (input.credit) {
    const { error } = await client.from("credit_notes").insert({
      invoice_id: invoiceId,
      credit_amount: input.credit.creditAmount,
      reason: input.credit.reason,
    });
    assertNoError(error);
  }

  if (input.proof) {
    const fileUrl = await uploadProofImage(stopId, input.proof.fileName, input.proof.imageDataUrl);
    const { error } = await client.from("delivery_proofs").insert({
      stop_id: stopId,
      file_name: input.proof.fileName,
      file_url: fileUrl,
    });
    assertNoError(error);
  }
};
