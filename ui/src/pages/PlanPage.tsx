import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plans } from '@metacall/protocol/plan';
import { ArrowLeft, ChevronDown } from 'lucide-react';

export default function PlanPage() {
    const navigate = useNavigate();
    const [checkoutPlan, setCheckoutPlan] = useState<{ id: Plans, name: string, price: string, color: string } | null>(null);

    const plans = [
        {
            id: Plans.Essential,
            name: 'Essential Plan',
            price: '10',
            description: 'Ideal for prototyping and small projects.',
            color: 'bg-gradient-to-r from-slate-600 to-slate-400',
            borderColor: 'hover:border-slate-500',
            buttonClass: 'bg-slate-600 hover:bg-slate-700',
            features: [
                'Unlimited Functions',
                'Unlimited Builds',
                'Medium Resources'
            ]
        },
        {
            id: Plans.Standard,
            name: 'Standard Plan',
            price: '29.99',
            description: 'Perfect for going to production with small and medium sized projects.',
            color: 'bg-gradient-to-r from-blue-700 to-blue-500',
            borderColor: 'hover:border-blue-600',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
            features: [
                'Unlimited Functions',
                'Unlimited Builds',
                'High Resources'
            ]
        },
        {
            id: Plans.Premium,
            name: 'Premium Plan',
            price: '80',
            description: 'The most reliable plan for enterprise projects.',
            color: 'bg-gradient-to-r from-pink-600 to-purple-500',
            borderColor: 'hover:border-pink-600',
            buttonClass: 'bg-pink-600 hover:bg-pink-700',
            features: [
                'Unlimited Functions',
                'Unlimited Builds',
                'Dedicated Resources',
                'Parallelization'
            ]
        }
    ];

    const handleSelectPlan = (plan: typeof plans[0]) => {
        setCheckoutPlan(plan);
    };

    const handleCloseCheckout = () => {
        setCheckoutPlan(null);
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-start p-4 sm:p-10 min-h-[calc(100vh-80px)] animate-in fade-in duration-500 relative">

            <div className="w-full max-w-5xl mt-6 relative">

                {/* Back / Close Button */}
                <div className="flex justify-end w-full mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1 px-3 border border-slate-300 rounded hover:bg-slate-100 transition-colors bg-white flex items-center justify-center text-slate-800"
                        title="Close Plans"
                    >
                        <ArrowLeft size={16} strokeWidth={2.5} className="mr-2" /> Back
                    </button>
                </div>

                <div className="text-center mb-12 px-4">
                    <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Select one of our subscription plans</h2>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Scale effortlessly to millions of requests with MetaCall's FaaS.</p>
                </div>

                <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 px-4">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`border border-slate-300 bg-white flex flex-col relative overflow-hidden group transition-colors w-full md:w-1/3 ${plan.borderColor}`}>
                            {/* Colored Traingle Ribbon */}
                            <div className={`absolute top-0 right-0 w-16 h-16 ${plan.color} transform translate-x-1/2 -translate-y-1/2 rotate-45`}></div>

                            <div className="p-8 pb-6 flex-grow">
                                <h3 className="text-[12px] font-bold text-slate-900 mb-6">{plan.name}</h3>

                                <div className="flex items-end gap-1 mb-1">
                                    <span className="text-5xl font-bold text-slate-800 tracking-tight">
                                        €{plan.price.split('.')[0]}
                                        <span className="text-2xl align-top">{plan.price.split('.')[1] || ''}</span>
                                    </span>
                                    <span className="text-sm font-bold text-slate-500 mb-1">/MO</span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-6 mt-1 text-center w-[120px]">per deploy</p>

                                <p className="text-[13px] text-gray-600 mb-10 min-h-[40px] leading-relaxed">
                                    {plan.description}
                                </p>

                                <ul className="flex flex-col gap-6 text-[13px] text-gray-600">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-slate-800 rounded-full shrink-0"></div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-1">
                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    className={`w-full py-4 text-white font-bold text-[14px] transition-colors rounded-sm ${plan.buttonClass}`}
                                >
                                    Select {plan.name.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Checkout Modal Overlay */}
            {checkoutPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white border border-slate-300 w-full max-w-lg flex flex-col overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 pb-2">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Checkout</h2>
                                <button
                                    onClick={handleCloseCheckout}
                                    className="p-1 border border-slate-300 rounded hover:bg-slate-100 transition-colors text-slate-500"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            </div>

                            <div className={`w-full ${checkoutPlan.color} text-white px-4 py-3 flex justify-between items-center mb-6`}>
                                <span className="font-medium text-[13px]">Subscription €{checkoutPlan.price} / mo</span>
                                <span className="font-medium text-[12px] font-bold">{checkoutPlan.name}</span>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 pb-6 overflow-y-auto max-h-[70vh]">
                            <h3 className="text-[13px] text-slate-600 mb-3">Payment details</h3>
                            <div className="flex items-center px-3 py-2.5 mb-6">
                                <div className="w-6 h-4 bg-slate-200 rounded flex items-center justify-center mr-3 shrink-0 text-[8px] text-slate-500 font-bold border border-slate-300">Card</div>
                                <input
                                    type="text"
                                    placeholder="Card number"
                                    className="flex-grow outline-none text-[13px] placeholder:text-slate-400"
                                />
                                <span className="text-[13px] text-slate-400 ml-2 shrink-0">MM / YY CVC</span>
                            </div>

                            <h3 className="text-[13px] text-slate-600 mb-3">Billing address</h3>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    className="border border-slate-300 rounded px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Address"
                                    className="border border-slate-300 rounded px-3 py-2.5 text-[13px] outline-none focus:border-blue-500"
                                />
                                <div className="grid grid-cols-3 gap-0">
                                    <input
                                        type="text"
                                        placeholder="City"
                                        className="border-y border-l border-slate-300 rounded-l px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 w-full"
                                    />
                                    <input
                                        type="text"
                                        placeholder="State"
                                        className="border border-slate-300 px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 w-full"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Postal code"
                                        className="border-y border-r border-slate-300 rounded-r px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 w-full"
                                    />
                                </div>
                                <div className="relative">
                                    <select className="border border-slate-300 rounded px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 text-slate-600 appearance-none bg-white w-full pr-10">
                                        <option>Select Country...</option>
                                        <option>United States</option>
                                        <option>Spain</option>
                                        <option>United Kingdom</option>
                                        <option>Germany</option>
                                        <option>France</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-[13px] text-slate-600 mb-2">Summary</h3>
                                <div className="flex items-end gap-2">
                                    <p className="font-bold text-slate-800 text-[14px]">Total €0.00</p>
                                </div>
                                <p className="text-[11px] text-slate-500">Includes 0% sales tax</p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 flex flex-col items-end border-t border-slate-200 bg-slate-50">
                            <button
                                onClick={handleCloseCheckout} // mock action
                                className="bg-blue-600 hover:bg-blue-700 font-bold text-white text-[13px] py-1.5 px-6 rounded transition-colors mb-2"
                            >
                                Subscribe
                            </button>
                            <p className="text-[10px] text-slate-500 text-right w-full">
                                Your card will be immediately charged €.
                            </p>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
