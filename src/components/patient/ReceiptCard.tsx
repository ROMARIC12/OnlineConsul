import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Eye, CheckCircle, Printer, Receipt, CheckCircle2 } from 'lucide-react';

interface ReceiptData {
  id: string;
  amount: number;
  transaction_ref: string | null;
  paid_at: string | null;
  created_at: string;
  payment_type: 'deposit' | 'balance';
  doctor_name: string;
  specialty: string;
  appointment_date: string;
  clinic_name?: string;
}

interface ReceiptCardProps {
  receipt: ReceiptData;
  patientName: string;
  patientEmail?: string;
}

export function ReceiptCard({ receipt, patientName, patientEmail }: ReceiptCardProps) {
  const [showReceipt, setShowReceipt] = useState(false);

  const generateReceiptNumber = () => {
    const date = format(new Date(receipt.created_at), 'yyyyMMdd');
    const ref = receipt.transaction_ref?.slice(-6) || receipt.id.slice(0, 6);
    return `KS-${date}-${ref.toUpperCase()}`;
  };

  const receiptNumber = generateReceiptNumber();

  const downloadReceipt = () => {
    const receiptContent = `
╔══════════════════════════════════════════════════════════════════╗
║                         REÇU DE PAIEMENT                         ║
║                           KôKô Santé                              ║
╚══════════════════════════════════════════════════════════════════╝

N° Reçu: ${receiptNumber}
Date: ${format(new Date(receipt.paid_at || receipt.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}

──────────────────────────────────────────────────────────────────
INFORMATIONS PATIENT
──────────────────────────────────────────────────────────────────
Nom: ${patientName}
${patientEmail ? `Email: ${patientEmail}` : ''}

──────────────────────────────────────────────────────────────────
DÉTAILS DE LA CONSULTATION
──────────────────────────────────────────────────────────────────
Médecin: ${receipt.doctor_name}
Spécialité: ${receipt.specialty}
${receipt.clinic_name ? `Centre: ${receipt.clinic_name}` : ''}
Date RDV: ${format(new Date(receipt.appointment_date), 'dd/MM/yyyy', { locale: fr })}

──────────────────────────────────────────────────────────────────
PAIEMENT
──────────────────────────────────────────────────────────────────
Type: ${receipt.payment_type === 'deposit' ? 'Arrhes (Acompte)' : 'Solde'}
Référence Transaction: ${receipt.transaction_ref || 'N/A'}

╔══════════════════════════════════════════════════════════════════╗
║   MONTANT PAYÉ:                     ${receipt.amount.toLocaleString().padStart(15)} FCFA   ║
╚══════════════════════════════════════════════════════════════════╝

Statut: ✓ PAYÉ

──────────────────────────────────────────────────────────────────
Ce reçu atteste du paiement effectué via la plateforme KôKô Santé.
Conservez ce document pour vos records.

Merci de votre confiance !
www.koko-sante.com
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recu-${receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Reçu ${receiptNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto; 
              color: #1e293b;
              line-height: 1.5;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #f1f5f9; 
              padding-bottom: 30px; 
              margin-bottom: 30px; 
            }
            .logo {
              font-size: 32px;
              font-weight: 800;
              color: #2563eb;
              letter-spacing: -0.025em;
              margin-bottom: 10px;
            }
            .header p { margin: 5px 0; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; }
            .receipt-number { font-weight: 800; color: #0f172a; font-size: 18px; margin-top: 10px; }
            .section { margin: 30px 0; }
            .section h3 { 
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #94a3b8;
              border-bottom: 1px solid #f1f5f9; 
              padding-bottom: 10px; 
              margin-bottom: 15px;
            }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #f1f5f9; font-size: 13px; }
            .row span:first-child { color: #64748b; font-weight: 500; }
            .row span:last-child { color: #0f172a; font-weight: 700; }
            .amount-box { 
              background: #f8fafc; 
              padding: 40px; 
              text-align: center; 
              margin: 40px 0; 
              border-radius: 24px; 
              border: 1px solid #f1f5f9;
            }
            .amount { font-size: 42px; font-weight: 900; color: #0f172a; letter-spacing: -0.05em; margin: 0; }
            .status { 
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: #dcfce7;
              color: #166534;
              padding: 6px 16px;
              border-radius: 99px;
              font-weight: 800;
              font-size: 11px;
              text-transform: uppercase;
              margin-top: 15px;
            }
            .footer { text-align: center; margin-top: 60px; color: #94a3b8; font-size: 11px; }
            @media print { 
              body { padding: 0; } 
              .amount-box { border: 1px solid #f1f5f9 !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">KôKô Santé</div>
            <p>Reçu de Transaction Professionnel</p>
            <div class="receipt-number">${receiptNumber}</div>
          </div>
          
          <div class="grid">
            <div class="section">
              <h3>Détails Patient</h3>
              <div class="row"><span>Nom Complet</span><span>${patientName}</span></div>
              ${patientEmail ? `<div class="row"><span>Email</span><span>${patientEmail}</span></div>` : ''}
              <div class="row"><span>Date d'émission</span><span>${format(new Date(receipt.paid_at || receipt.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span></div>
            </div>
            
            <div class="section">
              <h3>Détails Médicaux</h3>
              <div class="row"><span>Praticien</span><span>${receipt.doctor_name}</span></div>
              <div class="row"><span>Spécialité</span><span>${receipt.specialty}</span></div>
              <div class="row"><span>Date du RDV</span><span>${format(new Date(receipt.appointment_date), 'dd MMMM yyyy', { locale: fr })}</span></div>
            </div>
          </div>
          
          <div class="amount-box">
            <p style="margin:0 0 10px 0;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-size:10px;">Montant Total Acquitté</p>
            <p class="amount">${receipt.amount.toLocaleString()} FCFA</p>
            <div class="status">✓ PAIEMENT CONFIRMÉ</div>
            <p style="margin-top:20px;font-size:11px;color:#94a3b8;font-family:monospace;letter-spacing:0.05em;">REFERENCE: ${receipt.transaction_ref || receipt.id}</p>
          </div>
          
          <div class="footer">
            <p>Ce document est un reçu officiel généré électroniquement par KôKô Santé.</p>
            <p>Siège Social: Abidjan, Côte d'Ivoire | www.koko-sante.com</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <Card className="overflow-hidden border-none shadow-sm bg-white hover:shadow-md transition-all rounded-2xl group">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            <div className="w-2 bg-green-500" />
            <div className="flex-1 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-slate-900">
                      {receipt.amount.toLocaleString()} FCFA
                    </span>
                    <Badge className="bg-green-500 hover:bg-green-500 text-[8px] h-4 px-1 rounded-sm border-none uppercase font-black">Validé</Badge>
                  </div>
                  <p className="text-sm font-bold text-slate-600">
                    {receipt.doctor_name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {format(new Date(receipt.paid_at || receipt.created_at), 'dd MMM yyyy', { locale: fr })} • {receiptNumber}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl border-slate-100 bg-slate-50 hover:bg-white hover:border-primary hover:text-primary transition-all font-bold gap-2 px-4"
                  onClick={() => setShowReceipt(true)}
                >
                  <Eye className="h-4 w-4" />
                  Détails
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={downloadReceipt}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md !p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
          <div className="bg-gradient-to-br from-primary to-blue-700 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CheckCircle2 className="h-32 w-32" />
            </div>
            <div className="relative z-10 text-center space-y-2">
              <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Reçu Officiel</h2>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">KôKô Santé • {receiptNumber}</p>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-white">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</p>
                <p className="text-sm font-bold text-slate-900">{patientName}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                <p className="text-sm font-bold text-slate-900">{format(new Date(receipt.paid_at || receipt.created_at), 'dd/MM/yyyy', { locale: fr })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Praticien</p>
                <p className="text-sm font-bold text-slate-900">{receipt.doctor_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{receipt.specialty}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                <p className="text-sm font-bold text-slate-900">{receipt.payment_type === 'deposit' ? 'Acompte' : 'Solde Total'}</p>
              </div>
            </div>

            <div className="relative p-8 rounded-[2rem] bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Montant Payé</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{receipt.amount.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-400">FCFA</span>
              </div>
              <div className="inline-flex items-center gap-1.5 mt-3 py-1 px-3 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Transaction Confirmée
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">Ref: {receipt.transaction_ref || receipt.id}</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl border-slate-100 bg-slate-50 hover:bg-white hover:shadow-lg transition-all font-bold gap-2"
                onClick={downloadReceipt}
              >
                <Download className="h-4 w-4 text-primary" />
                Télécharger
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all font-bold gap-2"
                onClick={printReceipt}
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
