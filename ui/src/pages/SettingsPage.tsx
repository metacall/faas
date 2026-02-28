import { useNavigate } from 'react-router-dom';
import { User, Building2, Key, Shield, ExternalLink, Trash2, ReceiptText, RefreshCw, Rocket, Lock } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

export default function SettingsPage() {
    const navigate = useNavigate();

    return (
        <div className="flex-grow flex flex-col items-center justify-start p-4 bg-white min-h-[calc(100vh-80px)] animate-in fade-in duration-500">
            <div className="w-full max-w-[1400px] flex flex-col mt-4">

                {/* Page header */}
                <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-800">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Account Settings</h2>
                        <p className="text-gray-500 mt-1 text-sm font-medium">Manage your profile, security, and billing details to customize your MetaCall experience.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 items-start">

                    {/* Col 1 */}
                    <div className="flex flex-col gap-8">
                        {/* Account Details */}
                        <div className="border border-slate-300 bg-white flex flex-col">
                            <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                                <User size={14} className="text-slate-600" />
                                Account Details
                            </div>
                            <div className="p-6 flex flex-col gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                                    <div className="relative group">
                                        <input
                                            type="email"
                                            value="example@gmail.com"
                                            readOnly
                                            className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none font-semibold transition-colors"
                                        />
                                        <div className="absolute right-2 top-3 text-slate-400">
                                            <Lock size={14} />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-2">Primary email associated with this account.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">CLI Token</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWF..."
                                            readOnly
                                            className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 pr-10 text-sm outline-none font-mono truncate transition-colors"
                                        />
                                        <div className="absolute right-0 top-1.5">
                                            <CopyButton text="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-2 font-mono">Use this token to authenticate via the MetaCall CLI. Keep it secure.</p>
                                </div>
                            </div>
                        </div>

                        {/* Privacy and Security */}
                        <div className="border border-slate-300 bg-white flex flex-col">
                            <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                                <Shield size={14} className="text-slate-600" />
                                Privacy & Data
                            </div>
                            <div className="p-6 flex flex-col gap-4 items-start">
                                <p className="text-[12px] text-gray-600 mb-2 leading-relaxed">
                                    Review our data handling policies or permanently delete your account and all associated deployments.
                                </p>
                                <a href="update_soon" className="w-full flex justify-between items-center px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider font-bold group">
                                    Terms and Conditions
                                    <ExternalLink size={14} className="text-gray-400" />
                                </a>
                                <a href="update_soon" className="w-full flex justify-between items-center px-4 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider font-bold group">
                                    Privacy Policy
                                    <ExternalLink size={14} className="text-gray-400" />
                                </a>
                                <div className="w-full h-px bg-slate-200 mt-2 mb-2"></div>
                                <button className="w-full flex items-center justify-center gap-2 border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs uppercase tracking-wider font-bold px-4 py-3 transition-colors">
                                    <Trash2 size={16} strokeWidth={2.5} />
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Col 2 */}
                    <div className="flex flex-col gap-8">
                        {/* Company VAT */}
                        <div className="border border-slate-300 bg-white flex flex-col h-full">
                            <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                                <Building2 size={14} className="text-slate-600" />
                                Company VAT
                            </div>
                            <div className="p-6 flex-grow flex flex-col justify-between gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">VAT ID Number</label>
                                    <input
                                        type="text"
                                        placeholder="EU123456789"
                                        className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none font-mono focus:border-slate-800 transition-colors placeholder:text-gray-300"
                                    />
                                    <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                                        Enter your valid VAT ID for tax exemption on future invoices. validate against European VAT Information Exchange System (VIES).
                                    </p>
                                </div>
                                <div className="flex justify-start">
                                    <button className="text-slate-800 border border-slate-300 px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-slate-50 transition-colors hover:border-slate-800 hover:cursor-pointer">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Col 3 */}
                    <div className="flex flex-col gap-8">
                        {/* Change Password */}
                        <div className="border border-slate-300 bg-white flex flex-col h-full">
                            <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center gap-2">
                                <Key size={14} className="text-slate-600" />
                                Security
                            </div>
                            <div className="p-6 flex-grow flex flex-col gap-5">
                                <p className="text-[12px] text-gray-600 mb-2 leading-relaxed">
                                    Ensure your account is using a long, random password to stay secure.
                                </p>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Current Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">New Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-transparent border-b border-slate-300 text-slate-800 px-0 py-2.5 text-sm outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                                <div className="flex justify-start mt-auto pt-4">
                                    <button className="text-slate-800 border border-slate-300 px-3 py-2 text-xs uppercase tracking-widest font-bold hover:bg-slate-50 transition-colors hover:border-slate-800 hover:cursor-pointer">
                                        Update Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing History Full W */}
                <div className="border border-slate-300 bg-white flex flex-col mb-8">
                    <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ReceiptText size={14} className="text-slate-600" />
                            Billing History
                        </div>
                    </div>
                    <div className="p-8 flex flex-col gap-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <h4 className="text-xl font-bold text-slate-800 tracking-tight">Payments List</h4>
                                <p className="text-sm font-medium text-gray-500 mt-1">Download your past invoices and usage reports.</p>
                            </div>
                            <button className="p-2 border border-slate-300 text-gray-500 hover:text-slate-800 hover:border-slate-800 transition-all rounded-sm">
                                <RefreshCw size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="border border-dashed border-slate-300 bg-slate-50 min-h-[160px] flex flex-col items-center justify-center p-6 text-center group hover:border-slate-400 transition-colors">
                            <div className="w-12 h-12 mb-3 text-gray-300 group-hover:text-gray-400 transition-colors flex items-center justify-center">
                                <ReceiptText size={28} strokeWidth={1.5} />
                            </div>
                            <p className="text-[14px] font-bold text-slate-800">No invoices generated yet</p>
                            <p className="text-[13px] text-gray-500 mt-1">Once you start using paid features, your invoices will appear here.</p>
                        </div>

                        <div className="flex items-center justify-end">
                            <div className="flex items-stretch border border-slate-300 rounded-sm">
                                <button className="bg-white text-gray-500 hover:text-slate-900 hover:bg-slate-50 px-4 py-2 border-r border-slate-300 text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-colors">
                                    Prev
                                </button>
                                <div className="bg-slate-100 text-slate-600 font-bold text-[11px] px-6 py-2 flex items-center tracking-widest uppercase font-mono border-r border-slate-300">
                                    PAGE 1
                                </div>
                                <button className="bg-white text-gray-500 hover:text-slate-900 hover:bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscriptions Full W */}
                <div className="border border-slate-300 bg-white flex flex-col mb-12">
                    <div className="bg-slate-50 text-slate-800 text-[11px] uppercase tracking-widest font-bold px-6 py-4 border-b border-slate-300 flex flex-col sm:flex-row gap-4 sm:gap-0 sm:items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Rocket size={14} className="text-slate-600" />
                            Active Subscriptions
                        </div>
                        <button
                            onClick={() => navigate('/plans')}
                            className="px-4 py-2 bg-slate-800 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-slate-700 transition-colors flex items-center gap-2 w-max rounded-sm"
                        >
                            Upgrade Plan
                        </button>
                    </div>
                    <div className="p-8">
                        <div className="p-8 text-[13px] text-gray-600 font-medium bg-slate-50 border border-slate-200 border-dashed text-center">
                            No active paid subscriptions. You are currently on the <strong className="text-slate-800">Free Tier</strong>.
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
