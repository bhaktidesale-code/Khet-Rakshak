/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Wallet, PlusCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck, 
  Clock, CheckCircle2, QrCode, CreditCard, Landmark, HelpCircle
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface WalletPaymentsProps {
  currentLanguage: Language;
}

export default function WalletPayments({
  currentLanguage
}: WalletPaymentsProps) {
  const t = translations[currentLanguage];

  // Wallet Balance stateful value
  const [balance, setBalance] = useState(850);
  const [addAmount, setAddAmount] = useState('500');
  const [addMethod, setAddMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Transaction history log list
  const [transactionsList, setTransactionsList] = useState([
    { id: 'TXN-9023', type: 'debit', desc: 'Drone Crop Scan - Booking #BK-810', amount: 170, date: '08 July 2026', status: 'completed' },
    { id: 'TXN-8431', type: 'credit', desc: 'Wallet Top-Up (GPay UPI)', amount: 500, date: '05 July 2026', status: 'completed' },
    { id: 'TXN-7230', type: 'debit', desc: 'Soil PH Tester Probe fee', amount: 120, date: '29 June 2026', status: 'completed' },
    { id: 'TXN-5120', type: 'credit', desc: 'FPC Group Booking Discount credit', amount: 30, date: '12 June 2026', status: 'completed' }
  ]);

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(addAmount) || 0;
    if (parsedAmount <= 0) return;

    if (addMethod === 'upi') {
      setShowQrModal(true);
    } else {
      executeTopUpDirect();
    }
  };

  const executeTopUpDirect = () => {
    const parsedAmount = parseInt(addAmount) || 0;
    setBalance(balance + parsedAmount);
    
    // Insert credit record
    const newTxn = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'credit',
      desc: `Wallet Top-Up (${addMethod.toUpperCase()})`,
      amount: parsedAmount,
      date: 'Today',
      status: 'completed'
    };

    setTransactionsList([newTxn, ...transactionsList]);
    setShowQrModal(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-emerald-950 dark:text-white">Farmer Wallet & Payments</h2>
          <p className="text-xs text-gray-500">Manage scan balances, view subsidies, and track payment receipts offline or online.</p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold font-mono">
          SECURE GATEWAY
        </span>
      </div>

      {/* Success alert top-up */}
      {showSuccessToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-bold shadow-lg animate-in fade-in duration-200">
          ✓ Wallet top-up complete! Your updated balance is now ₹{balance}.
        </div>
      )}

      {/* Grid: Balance Card on Left, Add Funds form on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Balance Viewer card */}
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 rounded-3xl flex flex-col justify-between border border-emerald-700 shadow-lg relative overflow-hidden">
          {/* Ambient background decoration */}
          <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-emerald-600/20 blur-xl"></div>
          
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">Available Balance</span>
            <span className="text-3xl md:text-4xl font-black block text-amber-300 font-mono">₹{balance}</span>
            <p className="text-[10px] text-emerald-200">Khet Rakshak Pay account is linked to Patil's Nashik ID.</p>
          </div>

          <div className="border-t border-emerald-700/50 pt-4 mt-6 flex justify-between items-center text-xs text-emerald-100 relative z-10">
            <div>
              <span className="text-[9px] text-emerald-300 block">Cooperative FPC Code:</span>
              <span className="font-bold font-mono">NASHIK-FPC-04</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-700/60 rounded-lg text-[9px] font-bold">15% Discount Active</span>
          </div>
        </div>

        {/* Add Funds Form card */}
        <div className="md:col-span-7 bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Add Funds to Wallet</h3>
          
          <form onSubmit={handleTopUp} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-gray-500">Amount (₹)</label>
                <input 
                  type="number" 
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-transparent font-bold text-gray-900 dark:text-white"
                  id="wallet-add-amount-input"
                />
              </div>

              {/* Quick choices */}
              <div className="flex items-end gap-1.5 pb-0.5">
                {[200, 500, 1000].map((val) => (
                  <button 
                    key={val}
                    type="button"
                    onClick={() => setAddAmount(val.toString())}
                    className="px-3 py-2 border rounded-lg hover:border-emerald-600 hover:bg-emerald-50 text-[10px] font-bold"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment method toggle */}
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-500 block">Payment Source</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'upi', label: 'UPI QR', icon: <QrCode className="w-4 h-4" /> },
                  { code: 'card', label: 'Debit Card', icon: <CreditCard className="w-4 h-4" /> },
                  { code: 'netbanking', label: 'Netbanking', icon: <Landmark className="w-4 h-4" /> }
                ].map((meth) => (
                  <button 
                    key={meth.code}
                    type="button"
                    onClick={() => setAddMethod(meth.code as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all ${
                      addMethod === meth.code 
                        ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20' 
                        : 'bg-white dark:bg-gray-850 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {meth.icon}
                    <span>{meth.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow shadow-emerald-700/15"
              id="wallet-top-up-submit-btn"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Top-Up Balance</span>
            </button>
          </form>
        </div>

      </div>

      {/* Transaction History ledger */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="font-display font-bold text-sm text-gray-950 dark:text-white">Transaction History & Receipts</h3>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-800 space-y-3.5 pt-1 text-xs">
          {transactionsList.map((txn) => (
            <div key={txn.id} className="flex justify-between items-center py-2 hover:bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
                  txn.type === 'credit' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {txn.type === 'credit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{txn.desc}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">{txn.id} • {txn.date}</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`font-mono font-black text-sm block ${
                  txn.type === 'credit' ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                </span>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                  {txn.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UPI QR Payment Modal Simulation */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95">
            <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">Scan UPI QR to Top-Up</h3>
            <p className="text-xs text-gray-500">Scan this dynamically generated BHIM QR to instantly top-up ₹{addAmount} to your wallet.</p>
            
            <div className="p-4 border-2 border-dashed rounded-2xl inline-block mx-auto">
              <QrCode className="w-32 h-32 text-gray-800" />
            </div>

            <p className="text-[10px] text-gray-400 font-mono">Reference Code: KR-UPI-VAL-9821</p>
            
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-1/2 py-2.5 border rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={executeTopUpDirect}
                className="w-1/2 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold"
                id="wallet-confirm-qr-payment-btn"
              >
                I Have Paid
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
