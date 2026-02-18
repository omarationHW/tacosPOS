// ============================================================
// TacosPOS - Print Agent (Thermal Printer)
// ============================================================
// This agent runs as a local Node.js process alongside the POS.
// It connects to Supabase Realtime, listens for new orders,
// and sends print commands to a thermal printer via ESC/POS.
//
// TODO: Install dependencies:
//   npm install @supabase/supabase-js escpos escpos-usb
//
// TODO: Configure the following environment variables:
//   SUPABASE_URL=your_project_url
//   SUPABASE_SERVICE_KEY=your_service_role_key
//   PRINTER_VENDOR_ID=0x04b8    (Epson default)
//   PRINTER_PRODUCT_ID=0x0202   (Check your printer model)
// ============================================================

// import { createClient } from '@supabase/supabase-js';
// import { formatKitchenTicket } from './ticket-formatter';
// import { printTicket } from './escpos';

// const supabaseUrl = process.env.SUPABASE_URL!;
// const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
// const supabase = createClient(supabaseUrl, supabaseKey);

// async function main() {
//   console.log('🖨️  Print Agent starting...');
//
//   // Subscribe to new orders
//   const channel = supabase
//     .channel('print-orders')
//     .on(
//       'postgres_changes',
//       {
//         event: 'INSERT',
//         schema: 'public',
//         table: 'orders',
//       },
//       async (payload) => {
//         const orderId = payload.new.id;
//         console.log(`📄 New order received: ${orderId}`);
//
//         try {
//           // Fetch full order with items
//           const { data: order } = await supabase
//             .from('orders')
//             .select(`
//               id, notes, order_type, created_at,
//               table:tables(name),
//               order_items(
//                 quantity,
//                 unit_price,
//                 product:products(name),
//                 order_item_modifiers(modifier_name, price_override)
//               )
//             `)
//             .eq('id', orderId)
//             .single();
//
//           if (!order) {
//             console.error('Order not found:', orderId);
//             return;
//           }
//
//           // Format and print kitchen ticket
//           const ticketContent = formatKitchenTicket(order);
//           await printTicket(ticketContent);
//           console.log(`✅ Ticket printed for order ${orderId}`);
//         } catch (err) {
//           console.error('❌ Print error:', err);
//         }
//       },
//     )
//     .subscribe();
//
//   console.log('🟢 Listening for new orders...');
//
//   // Graceful shutdown
//   process.on('SIGINT', async () => {
//     console.log('\n🔴 Shutting down print agent...');
//     await supabase.removeChannel(channel);
//     process.exit(0);
//   });
// }

// main().catch(console.error);

export {}; // Ensure this is treated as a module
