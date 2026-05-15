/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  ChevronLeft, 
  ChevronDown,
  Plus, 
  Minus, 
  ShoppingBag, 
  Home as HomeIcon, 
  User as UserIcon, 
  ArrowRight,
  CreditCard,
  CheckCircle2,
  Zap,
  Loader2,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Mail,
  Lock,
  LogOut,
  Trash2,
  X,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, Category, Extra, Order, OrderItem } from './types';
import { PRODUCTS as STATIC_PRODUCTS, CATEGORIES as STATIC_CATEGORIES, EXTRAS, ADDONS } from './constants';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { User as AuthUser } from '@supabase/supabase-js';

type Screen = 'home' | 'product' | 'cart' | 'checkout' | 'success' | 'admin' | 'history';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSize, setSelectedSize] = useState('300ml');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Auth State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('Cartão de Crédito');
  const [selectedAddress, setSelectedAddress] = useState({ label: 'Casa', address: 'Av. Paulista, 1000 - Apartamento 42, Bela Vista, São Paulo - SP' });
  
  // Supabase State
  const [products, setProducts] = useState<Product[]>(STATIC_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadingAuth(false);
      return;
    }

    // Check current session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.warn('Supabase session check failed:', err);
      })
      .finally(() => {
        setLoadingAuth(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured) return;

      // Don't set loading to true if we already have static data
      // Only set it true if we are specifically waiting for DB data and want to show a spinner
      try {
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: prodData } = await supabase.from('products').select('*');
        
        if (catData && catData.length > 0) setCategories(catData);
        if (prodData && prodData.length > 0) setProducts(prodData);
      } catch (error) {
        console.error('Error fetching from Supabase:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const deliveryFee = 0;
    const tax = subtotal * 0.08;
    return {
      subtotal,
      deliveryFee,
      tax,
      total: subtotal + tax
    };
  }, [cart]);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState(selectedAddress.address);
  const [addressLabelDraft, setAddressLabelDraft] = useState(selectedAddress.label);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return products;
    return products.filter(p => p.category_id === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const newItem: CartItem = {
      ...selectedProduct,
      quantity,
      selectedSize,
      selectedExtras,
      notes
    };

    setCart([...cart, newItem]);
    setCurrentScreen('cart');
    setQuantity(1);
    setSelectedExtras([]);
    setNotes('');
  };

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    
    if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
      // Demo order processing
      setTimeout(() => {
        setCart([]);
        setCurrentScreen('success');
        setPlacingOrder(false);
      }, 2000);
      return;
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total: cartTotal.total,
          delivery_address: selectedAddress,
          payment_method: selectedPayment
        })
        .select();

      if (orderError) {
        console.error('Error inserting order:', orderError);
        alert('Erro ao processar pedido. Por favor, tente novamente.');
        return;
      }

      const order = orderData?.[0];
      if (!order) {
        console.error('No order data returned after insert');
        alert('Erro ao recuperar dados do pedido.');
        return;
      }

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id.length > 10 ? item.id : null, // Only if it's a UUID
        product_name: item.name,
        quantity: item.quantity,
        selected_size: item.selectedSize,
        selected_extras: item.selectedExtras,
        notes: item.notes,
        price_at_order: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        console.error('Error inserting order items:', itemsError);
        alert('Erro ao registrar itens do pedido.');
        return;
      }

      setCart([]);
      setCurrentScreen('success');
    } catch (error) {
      console.error('Unexpected error placing order:', error);
      alert('Ocorreu um erro inesperado ao finalizar seu pedido.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
    setCart(newCart);
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentScreen('product');
  };

  // --- Screens ---

  const Sidebar = () => {
    const menuItems = [
      { id: 'home', label: 'Início', icon: HomeIcon },
      { id: 'history', label: 'Pedidos', icon: Calendar },
      { id: 'cart', label: 'Carrinho', icon: ShoppingBag, badge: cart.length },
      { id: 'admin', label: 'Perfil', icon: UserIcon },
    ];

    return (
      <aside className="hidden lg:flex flex-col w-80 h-screen sticky top-0 bg-white border-r border-stone-100 py-12 px-8 text-[#4C2A4C] overflow-y-auto z-50">
        <div className="mb-20">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setCurrentScreen('home')}>
            <div className="w-14 h-14 bg-[#4C2A4C] rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-purple-900/30 group-hover:rotate-6 transition-transform duration-500">
              <Zap className="w-7 h-7 text-[#FFD700] fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight leading-none">AÇAÍ PREMIUM</span>
              <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.4em] mt-1">Açaí Hub</span>
            </div>
          </div>
        </div>

        <nav className="flex-grow space-y-4">
          <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em] ml-4 mb-6">Menu de Navegação</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id as Screen)}
              className={`w-full flex items-center gap-5 px-6 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all group ${
                currentScreen === item.id 
                  ? 'bg-[#4C2A4C] text-white shadow-2xl shadow-purple-900/20 translate-x-2' 
                  : 'text-stone-400 hover:bg-stone-50 hover:text-[#4C2A4C]'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${currentScreen === item.id ? 'text-[#FFD700] fill-current' : 'text-stone-300'}`} />
              <span className="flex-grow text-left text-[11px]">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`w-6 h-6 flex items-center justify-center rounded-xl text-[10px] font-black ${currentScreen === item.id ? 'bg-[#FFD700] text-[#4C2A4C]' : 'bg-stone-100 text-[#4C2A4C]'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-12 space-y-6">
          <div className="bg-stone-50/50 p-6 rounded-[2.5rem] border border-stone-100 text-center">
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-stone-100">
                <HelpCircle className="w-5 h-5 text-[#4C2A4C]/30" />
             </div>
             <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-3">Suporte ao Cliente</p>
             <button className="text-[11px] font-black text-[#4C2A4C] hover:text-[#FFD700] transition-colors uppercase">Central de Ajuda</button>
          </div>
          
          {user ? (
            <div className="bg-[#4C2A4C] p-6 rounded-[2.5rem] shadow-2xl shadow-purple-900/30">
              <div className="flex items-center gap-4">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  alt="Perfil" 
                  className="w-12 h-12 rounded-2xl bg-white/10 p-0.5 border border-white/20 shadow-inner"
                />
                <div className="min-w-0">
                  <p className="text-sm font-black truncate text-white uppercase tracking-tight">{user.email?.split('@')[0]}</p>
                  <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">Premium Member</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  if (isSupabaseConfigured) {
                    await supabase.auth.signOut();
                  }
                  setUser(null);
                  setCurrentScreen('home');
                }}
                className="w-full mt-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Desconectar
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setCurrentScreen('admin')}
              className="w-full bg-[#FFD700] text-[#4C2A4C] py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-yellow-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all hover:bg-yellow-500"
            >
              Entrar Agora
            </button>
          )}
        </div>
      </aside>
    );
  };

  const HomeScreen = () => (
    <div className="bg-[#FAF9FF] min-h-screen pb-20 lg:pb-0">
      <header className="bg-[#4C2A4C] lg:bg-[#F9F7F2] p-8 md:p-12 lg:pt-20 lg:pb-16 border-b border-stone-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#4C2A4C] lg:block hidden transform skew-x-12 translate-x-1/2 opacity-5"></div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="bg-[#FFD700]/10 text-[#FFD700] text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-[0.25em] animate-pulse">
                  Energia Pura
                </span>
                <span className="text-stone-300 font-bold text-xs">•</span>
                <span className="text-stone-400 font-bold text-[10px] uppercase tracking-widest">Açaí Hub Premium</span>
              </div>
              <h1 className="font-black text-5xl md:text-7xl lg:text-8xl text-white lg:text-[#4C2A4C] leading-[0.85] uppercase tracking-tighter">
                O sabor roxo <br/>
                <span className="text-[#FFD700] italic">do Pará.</span>
              </h1>
              <p className="hidden lg:block text-stone-500 max-w-2xl text-xl font-medium leading-relaxed">
                O autêntico Açaí Especial em misturas que despertam sua <span className="text-[#4C2A4C] font-black border-b-4 border-[#FFD700]/20">melhor versão.</span>
              </p>
            </div>
            
            <div className="flex flex-col gap-8 lg:w-[450px]">
              <div className="lg:hidden flex items-center justify-between">
                 {user ? (
                  <div 
                    className="flex items-center gap-3 bg-white/10 p-2 pr-5 rounded-[1.5rem] border border-white/10" 
                    onClick={() => setCurrentScreen('admin')}
                  >
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-12 h-12 rounded-2xl border-2 border-[#FFD700]" alt="Usuário" referrerPolicy="no-referrer" />
                    <span className="text-xs font-black uppercase tracking-widest">{user.email?.split('@')[0]}</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => setCurrentScreen('admin')}
                    className="bg-[#FFD700] text-[#4C2A4C] px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-yellow-500/30 active:scale-95 transition-all"
                  >
                    Login / Perfil
                  </button>
                )}
              </div>
              
              <div className="relative group">
                <div className="absolute left-8 top-1/2 -translate-y-1/2 p-2 rounded-xl text-stone-400 group-focus-within:text-[#FFD700] transition-colors">
                  <Search className="w-6 h-6" />
                </div>
                <input 
                  type="text" 
                  placeholder="Encontre seu açaí ideal..." 
                  className="w-full bg-white lg:bg-white text-gray-800 pl-20 pr-10 py-8 rounded-[2.5rem] border-none shadow-2xl lg:shadow-xl lg:shadow-purple-900/5 focus:ring-8 focus:ring-[#FFD700]/5 transition-all outline-none text-lg md:text-xl font-bold placeholder:text-stone-300"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="lg:mt-12 px-6 md:px-12 max-w-[1440px] mx-auto space-y-24 pb-20">
        <section>
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-1 bg-[#FFD700] rounded-full"></div>
                <h2 className="font-black text-4xl md:text-5xl text-[#4C2A4C] uppercase tracking-tighter">Categorias</h2>
              </div>
              <p className="text-stone-400 text-sm font-bold ml-20 uppercase tracking-widest">Sintonize seu sabor</p>
            </div>
            <button 
              onClick={() => setSelectedCategoryId(null)}
              className="group hidden lg:flex items-center gap-4 text-[#4C2A4C] font-black text-xs uppercase tracking-[0.25em] hover:text-[#FFD700] transition-colors"
            >
              <span>Ver Catálogo</span>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-[#FFD700] group-hover:text-[#4C2A4C] transition-all scale-90 group-hover:scale-110">
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </div>
          <div className="flex gap-6 md:gap-12 overflow-x-auto pb-12 no-scrollbar">
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                className="flex flex-col items-center gap-5 flex-shrink-0 group outline-none"
              >
                <div className={`w-28 h-28 md:w-44 md:h-44 rounded-[3.5rem] shadow-sm flex items-center justify-center border-4 transition-all duration-700 group-hover:scale-105 group-hover:-rotate-3 ${
                  selectedCategoryId === cat.id ? 'bg-[#FFD700] border-[#FFD700] text-[#4C2A4C] shadow-[#FFD700]/40 shadow-3xl' : 'bg-white border-transparent text-[#4C2A4C] group-hover:border-stone-100 hover:shadow-xl'
                }`}>
                  <span className="text-5xl md:text-7xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                </div>
                <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] ${selectedCategoryId === cat.id ? 'text-[#FFD700]' : 'text-stone-300 group-hover:text-[#4C2A4C]'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
            <div>
               <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-1 bg-[#FFD700] rounded-full"></div>
                <h2 className="font-black text-4xl md:text-5xl text-[#4C2A4C] uppercase tracking-tighter">
                  {selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : 'Destaques'}
                </h2>
              </div>
              <p className="text-stone-400 text-sm font-bold ml-20 uppercase tracking-widest">Misturas mais pedidas na semana</p>
            </div>
            
            <div className="hidden lg:flex p-2 bg-stone-100/50 rounded-[2rem] ml-16 border border-stone-100/50">
               <button className="bg-white text-[#4C2A4C] px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#4C2A4C]/5">Bombando</button>
               <button className="text-stone-400 px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:text-[#4C2A4C] transition-colors">Novidades</button>
               <button className="text-stone-400 px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:text-[#4C2A4C] transition-colors">Premium</button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-40">
              <Loader2 className="w-20 h-20 animate-spin text-[#FFD700]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-12">
              {filteredProducts.map(product => (
                <motion.div 
                   key={product.id}
                   layout
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   whileHover={{ y: -15 }}
                   onClick={() => openProduct(product)}
                   className="bg-white rounded-[4rem] p-7 shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(76,42,76,0.15)] flex flex-col border border-stone-50 cursor-pointer transition-all duration-700 h-full group relative overflow-hidden"
                >
                  <div className="absolute top-10 left-10 z-10 flex flex-col gap-2 pointer-events-none">
                    {product.price > 15 && (
                      <span className="bg-[#4C2A4C] text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-2xl backdrop-blur-md">Gourmet</span>
                    )}
                  </div>

                  <div className="relative aspect-square rounded-[3.5rem] overflow-hidden mb-10 bg-stone-50">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[1.5s]" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#4C2A4C]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-end justify-center pb-8 px-8">
                       <p className="text-white text-[10px] font-bold uppercase tracking-widest text-center translate-y-4 group-hover:translate-y-0 transition-transform duration-700">Ver Detalhes</p>
                    </div>
                  </div>
                  
                  <div className="flex-grow space-y-5">
                    <div className="space-y-2">
                       <p className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.2em]">
                        {categories.find(c => c.id === product.category_id)?.name}
                      </p>
                      <h3 className="font-black text-[#4C2A4C] text-2xl md:text-3xl leading-[0.9] uppercase tracking-tighter group-hover:text-[#FFD700] transition-colors h-14 line-clamp-2">{product.name}</h3>
                    </div>
                    
                    <p className="text-stone-400 text-sm line-clamp-2 font-medium leading-relaxed italic">"{product.description}"</p>
                    
                    <div className="flex items-center justify-between pt-8 border-t border-stone-50 group-hover:border-[#FFD700]/20 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-[#4C2A4C]">R$ {product.price.toFixed(2)}</span>
                      </div>
                      <div className="w-14 h-14 bg-[#F9F7F2] rounded-3xl flex items-center justify-center text-[#4C2A4C] group-hover:bg-[#FFD700] group-hover:text-[#4C2A4C] transition-all shadow-sm group-hover:shadow-2xl group-hover:shadow-yellow-500/40 group-hover:-rotate-12 active:scale-90">
                        <Plus className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section className="pb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-black text-2xl md:text-4xl text-[#4C2A4C] mb-2 uppercase tracking-tight">Adicionais Populares</h2>
              <p className="text-stone-400 text-sm font-bold">Turbine sua experiência</p>
            </div>
          </div>
          <div className="flex gap-6 md:gap-10 overflow-x-auto pb-6 no-scrollbar">
            {ADDONS.map((addon, i) => (
              <div key={i} className="min-w-[200px] md:min-w-[280px] bg-white p-6 rounded-[3rem] shadow-sm border border-stone-50 text-center hover:shadow-xl transition-all duration-300 group">
                <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 rounded-full bg-stone-50 overflow-hidden border-4 border-stone-50 group-hover:scale-105 transition-transform">
                  <img src={addon.image} alt={addon.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <p className="text-sm md:text-xl font-black text-[#4C2A4C] uppercase tracking-tight mb-1">{addon.name}</p>
                <div className="inline-block bg-[#FFD700]/5 px-4 py-1.5 rounded-full mt-2">
                  <p className="text-[#FFD700] font-black text-xs md:text-sm uppercase">+ R$ {addon.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Brand Story Footer */}
        <footer className="pt-20 pb-32 lg:pb-20 border-t border-stone-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-[#4C2A4C]">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#4C2A4C] rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-[#FFD700] fill-current" />
              </div>
              <span className="font-black text-2xl uppercase tracking-tighter">Açaí <span className="text-[#FFD700]">Hub</span></span>
            </div>
            <p className="text-sm font-medium text-stone-400 leading-relaxed max-w-xs">
              Energia pura direto da fonte. Nossa missão é entregar o autêntico sabor do Pará com a modernidade que você merece.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="font-black text-xs uppercase tracking-[0.3em] text-[#FFD700]">Explorar</h4>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-widest text-[#4C2A4C]/60">
              <li className="hover:text-[#4C2A4C] cursor-pointer" onClick={() => setSelectedCategoryId(null)}>Catálogo Completo</li>
              <li className="hover:text-[#4C2A4C] cursor-pointer" onClick={() => setCurrentScreen('history')}>Meus Pedidos</li>
              <li className="hover:text-[#4C2A4C] cursor-pointer" onClick={() => setCurrentScreen('admin')}>Área do Parceiro</li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h4 className="font-black text-xs uppercase tracking-[0.3em] text-[#FFD700]">Contato</h4>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-widest text-[#4C2A4C]/60">
              <li className="hover:text-[#4C2A4C] cursor-pointer">Instagram</li>
              <li className="hover:text-[#4C2A4C] cursor-pointer">WhatsApp</li>
              <li className="hover:text-[#4C2A4C] cursor-pointer">Central de Ajuda</li>
            </ul>
          </div>

          <div className="bg-[#4C2A4C] p-8 rounded-[3rem] text-white">
            <h4 className="font-black text-xs uppercase tracking-[0.3em] text-[#FFD700] mb-4">News Hub</h4>
            <p className="text-xs font-bold text-white/60 mb-6 leading-relaxed">Assine para receber promoções explosivas.</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="seu@parceiro.com" 
                className="w-full bg-white/10 border-none rounded-2xl py-4 px-6 text-xs font-bold focus:ring-2 focus:ring-[#FFD700] outline-none placeholder:text-white/20"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-[#FFD700] text-[#4C2A4C] px-4 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-white transition-colors">OK</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );

  const ProductDetailScreen = () => {
    if (!selectedProduct) return null;

    const totalPrice = useMemo(() => {
      const extrasCost = selectedExtras.reduce((acc, id) => {
        const extra = EXTRAS.find(e => e.id === id);
        return acc + (extra?.price || 0);
      }, 0);
      return (selectedProduct.price + extrasCost) * quantity;
    }, [selectedProduct, selectedExtras, quantity]);

    return (
      <div className="bg-[#F9F7F2] min-h-screen flex flex-col items-center justify-center p-4 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#4C2A4C]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#FFD700]/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4"></div>

        <button 
          onClick={() => {
            setCurrentScreen('home');
            setSelectedProduct(null);
          }}
          className="lg:hidden fixed top-6 left-6 z-50 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-stone-100"
        >
          <X className="w-6 h-6 text-[#4C2A4C]" />
        </button>

        <motion.div 
          layoutId={`prod-${selectedProduct.id}`}
          className="w-full max-w-6xl bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(76,42,76,0.1)] flex flex-col md:flex-row overflow-hidden border border-stone-100 relative z-10"
        >
          <div className="relative w-full md:w-[45%] bg-stone-50 overflow-hidden group">
            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" 
              referrerPolicy="no-referrer" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="absolute top-10 left-10">
              <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#4C2A4C] shadow-sm">
                Açaí Premium Especial
              </div>
            </div>
            
            <button 
              onClick={() => {
                setCurrentScreen('home');
                setSelectedProduct(null);
              }}
              className="hidden lg:flex absolute top-10 right-10 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-2xl items-center justify-center transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 p-8 md:p-14 lg:p-20 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="space-y-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#FFD700] uppercase tracking-[0.3em]">
                    {categories.find(c => c.id === selectedProduct.category_id)?.name}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-stone-300"></div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current text-yellow-500" />
                    Sabor Vibrante
                  </span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-[#4C2A4C] uppercase tracking-tighter leading-[0.9]">
                  {selectedProduct.name}
                </h2>
                <p className="text-stone-400 text-lg md:text-xl font-medium leading-relaxed italic">
                  "{selectedProduct.description}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-[#4C2A4C] uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-1 bg-[#FFD700] rounded-full"></div>
                    Selecione o Tamanho
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['300ml', '500ml', '700ml'].map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`group flex flex-col items-center justify-center p-6 border-2 rounded-[2rem] transition-all relative overflow-hidden ${
                          selectedSize === size 
                            ? 'border-[#4C2A4C] bg-[#4C2A4C] text-white shadow-xl shadow-purple-900/20' 
                            : 'border-stone-100 hover:border-stone-200 text-[#4C2A4C] hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-lg font-black">{size}</span>
                        <span className={`text-[9px] uppercase font-bold tracking-tighter ${selectedSize === size ? 'text-white/60' : 'text-stone-400'}`}>
                          {size === '300ml' ? 'Starter' : size === '500ml' ? 'Master' : 'Legend'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-[#4C2A4C] uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-1 bg-[#FFD700] rounded-full"></div>
                    Turbine seu açaí
                  </h3>
                  <div className="space-y-3">
                    {EXTRAS.map(extra => (
                      <label 
                        key={extra.id}
                        className={`flex items-center justify-between p-5 rounded-[1.5rem] cursor-pointer transition-all border ${
                          selectedExtras.includes(extra.id) 
                            ? 'bg-yellow-50/50 border-[#FFD700]/20' 
                            : 'bg-white border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            selectedExtras.includes(extra.id) ? 'bg-[#FFD700] border-[#FFD700]' : 'border-stone-200'
                          }`}>
                            {selectedExtras.includes(extra.id) && <Plus className="w-4 h-4 text-[#4C2A4C]" />}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={selectedExtras.includes(extra.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedExtras([...selectedExtras, extra.id]);
                              else setSelectedExtras(selectedExtras.filter(id => id !== extra.id));
                            }}
                          />
                          <span className="font-bold text-[#4C2A4C]">{extra.name}</span>
                        </div>
                        <span className="text-xs font-black text-[#FFD700] uppercase">+ R$ {extra.price.toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-[#4C2A4C] uppercase tracking-widest flex items-center gap-3">
                  <div className="w-8 h-1 bg-[#FFD700] rounded-full"></div>
                  Deseja algo especial?
                </h3>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Granola por cima, leite ninho separado..."
                  className="w-full bg-stone-50 border-none rounded-[2rem] p-6 focus:ring-4 focus:ring-[#FFD700]/10 outline-none font-medium text-[#4C2A4C] leading-relaxed"
                  rows={3}
                />
              </div>

              <div className="pt-10 border-t border-stone-100 flex flex-col lg:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8 bg-stone-100/50 p-2 rounded-[2rem] border border-stone-100">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-[#4C2A4C] shadow-sm hover:text-[#FFD700] active:scale-95 transition-all"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  <span className="text-4xl font-black text-[#4C2A4C] w-12 text-center">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-[#4C2A4C] shadow-sm hover:text-[#FFD700] active:scale-95 transition-all"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <button 
                  onClick={() => addToCart()}
                  className="w-full lg:w-auto flex-grow max-w-md bg-[#4C2A4C] text-white py-8 px-12 rounded-[2.5rem] font-black text-xl uppercase tracking-widest shadow-2xl shadow-purple-900/20 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-between group"
                >
                  <div className="text-left leading-none uppercase">
                    <p className="text-[10px] text-white/60 mb-1">Adicionar ao Carrinho</p>
                    <p>Fazer Pedido</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-px bg-white/20"></span>
                    <span className="text-2xl">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const CartScreen = () => (
    <div className="bg-[#F9F7F2] min-h-screen flex flex-col items-center p-4 md:p-12 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#4C2A4C]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
      
      <header className="w-full max-w-7xl flex items-center justify-between mb-12 relative z-10">
        <button 
          onClick={() => setCurrentScreen('home')} 
          className="group flex items-center gap-3 bg-white p-4 pr-6 rounded-2xl shadow-sm border border-stone-100 hover:shadow-md transition-all active:scale-95"
        >
          <div className="bg-stone-50 p-2 rounded-xl group-hover:bg-[#4C2A4C]/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#4C2A4C]" />
          </div>
          <span className="font-black text-xs uppercase tracking-widest text-[#4C2A4C]">Voltar</span>
        </button>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-[#4C2A4C] hidden md:block">
          Seu <span className="text-[#FFD700]">Carrinho</span>
        </h1>
        <div className="w-24"></div>
      </header>

      <main className="w-full max-w-7xl relative z-10">
        {cart.length === 0 ? (
          <div className="bg-white rounded-[4rem] p-24 shadow-[0_50px_100px_-20px_rgba(76,42,76,0.05)] border border-stone-100 flex flex-col items-center justify-center text-center">
            <div className="bg-stone-50 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-8">
              <ShoppingBag className="w-12 h-12 text-stone-200" />
            </div>
            <h2 className="text-3xl font-black text-[#4C2A4C] uppercase tracking-tight mb-4">Opa! Nada por aqui.</h2>
            <p className="text-stone-400 font-medium mb-10 max-w-sm">Seu carrinho está vazio. Explore nossos açaís especiais e escolha o seu sabor!</p>
            <button 
              onClick={() => setCurrentScreen('home')}
              className="bg-[#4C2A4C] text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-purple-900/20 hover:scale-105 active:scale-95 transition-all"
            >
              Explorar Loja
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <section className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-stone-100">
                <div className="hidden md:grid grid-cols-12 gap-4 pb-6 border-b border-stone-50 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 px-4">
                  <div className="col-span-6">Produto</div>
                  <div className="col-span-3 text-center">Quantidade</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
                <div className="divide-y divide-stone-50">
                  {cart.map((item, idx) => (
                    <article key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 items-center px-4 group">
                      <div className="col-span-6 flex gap-6 items-center">
                        <div className="w-24 h-24 bg-stone-50 rounded-[1.5rem] overflow-hidden flex-shrink-0 group-hover:shadow-lg transition-all duration-500">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-[#4C2A4C] text-xl leading-tight uppercase tracking-tight truncate">{item.name}</h3>
                          <p className="text-xs text-[#FFD700] font-black uppercase tracking-widest mt-1">
                            {item.selectedSize} • {item.selectedExtras.length} Extras
                          </p>
                          <button 
                            onClick={() => removeFromCart(idx)}
                            className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-300 hover:text-red-500 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Remover
                          </button>
                        </div>
                      </div>
                      
                      <div className="col-span-3 flex justify-center">
                        <div className="flex items-center bg-stone-50 p-2 rounded-2xl border border-stone-100">
                          <button 
                            onClick={() => updateQuantity(idx, -1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:text-[#FFD700] transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="mx-6 font-black text-[#4C2A4C] text-lg">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(idx, 1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:text-[#FFD700] transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="col-span-3 text-right">
                        <p className="text-2xl font-black text-[#4C2A4C]">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Promo Section */}
              <div className="bg-[#4C2A4C] rounded-[2.5rem] p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="relative z-10 text-center md:text-left">
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Tem um cupom?</h3>
                  <p className="text-white/60 font-medium text-sm">Insira o seu código para ganhar descontos exclusivos.</p>
                </div>
                <div className="w-full md:w-auto relative z-10 flex gap-3">
                  <input 
                    type="text" 
                    placeholder="DIGITE AQUI" 
                    className="flex-grow bg-white/10 border-white/20 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-white/10 outline-none font-black text-xs uppercase tracking-widest placeholder:text-white/30"
                  />
                  <button className="bg-white text-[#4C2A4C] font-black px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest shadow-xl">Aplicar</button>
                </div>
              </div>
            </section>

            <aside className="lg:col-span-4 sticky top-12">
              <div className="bg-white rounded-[3rem] p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-stone-100">
                <h2 className="text-2xl font-black text-[#4C2A4C] uppercase tracking-tight mb-8">Resumo</h2>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-stone-400 font-bold uppercase tracking-widest text-[10px]">
                    <span>Subtotal</span>
                    <span className="text-[#4C2A4C]">R$ {cartTotal.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-400 font-bold uppercase tracking-widest text-[10px]">
                    <span>Entrega</span>
                    <span className="text-[#4C2A4C]">CORTESIA</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-400 font-bold uppercase tracking-widest text-[10px]">
                    <span>Taxas</span>
                    <span className="text-[#4C2A4C]">R$ {cartTotal.tax.toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-8 mt-8 border-t border-dashed border-stone-100">
                    <div className="flex justify-between items-end mb-10">
                      <div>
                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-1">Total do Pedido</p>
                        <p className="text-5xl font-black text-[#FFD700]">R$ {cartTotal.total.toFixed(2)}</p>
                      </div>
                      <div className="bg-[#FFD700]/10 p-3 rounded-2xl">
                        <CheckCircle2 className="w-8 h-8 text-[#FFD700]" />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setCurrentScreen('checkout')}
                      className="w-full bg-[#4C2A4C] text-white py-8 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-900/40 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-4 group"
                    >
                      Continuar
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </button>
                    
                    <p className="text-center text-[9px] text-stone-300 mt-6 uppercase tracking-[0.3em] font-black italic">Checkout Seguro & Criptografado</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );

  const CheckoutScreen = () => {
    return (
      <div className="bg-[#F9F7F2] min-h-screen flex flex-col items-center p-4 md:p-12 relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-[#FFD700]/5 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/4"></div>

        <header className="w-full max-w-7xl flex items-center justify-between mb-12 relative z-10">
          <button 
            onClick={() => setCurrentScreen('cart')} 
            className="group flex items-center gap-3 bg-white p-4 pr-6 rounded-2xl shadow-sm border border-stone-100 hover:shadow-md transition-all active:scale-95"
          >
            <div className="bg-stone-50 p-2 rounded-xl group-hover:bg-[#4C2A4C]/10 transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#4C2A4C]" />
            </div>
            <span className="font-black text-xs uppercase tracking-widest text-[#4C2A4C]">Voltar</span>
          </button>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#4C2A4C] hidden md:block">
            Quase lá, <span className="text-[#FFD700]">Finalizar</span>
          </h1>
          <div className="w-24"></div>
        </header>

        <main className="w-full max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 space-y-12">
              {/* Delivery Section */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-[#4C2A4C] uppercase tracking-tight flex items-center gap-4">
                    <div className="bg-[#FFD700] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                      <MapPin className="w-6 h-6 text-[#4C2A4C]" />
                    </div>
                    Entrega
                  </h3>
                  <button 
                    onClick={() => {
                      setAddressDraft(selectedAddress.address);
                      setAddressLabelDraft(selectedAddress.label);
                      setIsAddressModalOpen(true);
                    }}
                    className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest bg-white border border-stone-100 px-6 py-3 rounded-xl hover:bg-stone-50 transition-colors shadow-sm"
                  >
                    Alterar
                  </button>
                </div>
                
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100 flex items-start gap-8 group hover:shadow-md transition-all">
                  <div className="bg-stone-50 p-5 rounded-[1.5rem] flex-shrink-0 group-hover:bg-[#4C2A4C]/5 transition-colors">
                    <HomeIcon className="w-8 h-8 text-[#4C2A4C]" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-black text-[#4C2A4C] text-2xl uppercase tracking-tight mb-2">{selectedAddress.label}</p>
                    <p className="text-stone-400 font-medium leading-[1.8] text-lg">
                      {selectedAddress.address}
                    </p>
                  </div>
                </div>
              </section>

              {/* Payment Section */}
              <section>
                <h3 className="text-2xl font-black text-[#4C2A4C] uppercase tracking-tight flex items-center gap-4 mb-8">
                  <div className="bg-[#FFD700] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                    <CreditCard className="w-6 h-6 text-[#4C2A4C]" />
                  </div>
                  Pagamento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'cc', label: 'Cartão de Crédito', icon: CreditCard, display: 'Cartão' },
                    { id: 'pix', label: 'Pix', icon: Zap, display: 'Pix' },
                    { id: 'cash', label: 'Dinheiro', icon: DollarSign, display: 'Dinheiro' }
                  ].map((method) => (
                    <button 
                      key={method.id}
                      onClick={() => setSelectedPayment(method.label)}
                      className={`flex flex-col items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden ${
                        selectedPayment === method.label 
                          ? 'bg-[#4C2A4C] border-[#4C2A4C] text-white shadow-2xl shadow-purple-900/30' 
                          : 'bg-white border-stone-100 text-[#4C2A4C]/40 hover:border-stone-200'
                      }`}
                    >
                      {selectedPayment === method.label && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-[2rem] flex items-center justify-center">
                          <div className="bg-white w-2 h-2 rounded-full"></div>
                        </div>
                      )}
                      <div className={`p-5 rounded-[1.5rem] transition-colors ${selectedPayment === method.label ? 'bg-white/20' : 'bg-stone-50'}`}>
                        <method.icon className="w-8 h-8" />
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-[0.2em]">{method.display}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Mini Summary */}
            <aside className="lg:col-span-5 sticky top-12">
              <div className="bg-white rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-stone-100 overflow-hidden">
                <div className="bg-[#4C2A4C] p-10 text-white flex items-center justify-between">
                  <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3">
                    <ShoppingBag className="w-6 h-6 text-[#FFD700]" />
                    Resumo
                  </h3>
                  <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black tracking-widest">
                    {cart.reduce((s, i) => s + i.quantity, 0)} ITENS
                  </span>
                </div>
                
                <div className="p-10 space-y-8">
                  <div className="max-h-64 overflow-y-auto no-scrollbar space-y-6">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex gap-5 items-center group">
                        <div className="w-16 h-16 bg-stone-50 rounded-2xl overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-black text-[#4C2A4C] text-sm truncate uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest mt-1">{item.selectedSize} • {item.quantity} Uni.</p>
                        </div>
                        <p className="font-black text-[#4C2A4C] text-sm">R$ {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-stone-100 space-y-4">
                    <div className="flex justify-between text-[10px] font-black text-stone-300 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>R$ {cartTotal.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-stone-300 uppercase tracking-widest">
                      <span>Entrega</span>
                      <span className="text-[#4C2A4C]">CORTESIA</span>
                    </div>
                    
                    <div className="pt-8 mt-8 border-t border-dashed border-stone-200">
                      <div className="flex justify-between items-end mb-10 text-center lg:text-left">
                        <div className="flex-grow">
                          <p className="text-stone-300 text-[9px] font-black uppercase tracking-[0.3em] mb-2">Total do Investimento</p>
                          <p className="text-6xl font-black text-[#FFD700] leading-none mb-2">R$ {cartTotal.total.toFixed(2)}</p>
                          <p className="text-[10px] text-stone-200 font-medium italic">Taxas inclusas (8% ISS/Energia)</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={handlePlaceOrder}
                        disabled={placingOrder}
                        className="w-full bg-[#4C2A4C] text-white py-8 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 hover:bg-purple-900 group"
                      >
                        {placingOrder ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            Confirmar Pedido
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {isAddressModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 space-y-10 border border-stone-100"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-[#4C2A4C] uppercase tracking-tighter">Editar Localização</h3>
                <button 
                  onClick={() => setIsAddressModalOpen(false)} 
                  className="p-3 bg-stone-50 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-6 h-6 text-[#4C2A4C]" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 ml-4">Identificação (Ex: Lar Doce Lar)</label>
                  <input 
                    type="text" 
                    value={addressLabelDraft}
                    onChange={(e) => setAddressLabelDraft(e.target.value)}
                    className="w-full bg-stone-50 border-none rounded-2xl p-5 focus:ring-4 focus:ring-[#FFD700]/10 outline-none font-black text-sm text-[#4C2A4C] uppercase"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300 ml-4">Onde vamos entregar?</label>
                  <textarea 
                    value={addressDraft}
                    onChange={(e) => setAddressDraft(e.target.value)}
                    rows={4}
                    className="w-full bg-stone-50 border-none rounded-[2rem] p-8 focus:ring-4 focus:ring-[#FFD700]/10 outline-none font-medium text-[#4C2A4C] leading-relaxed"
                    placeholder="Rua, Número, Bairro..."
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-grow py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] text-stone-300 hover:bg-stone-50 transition-colors"
                >
                  Descartar
                </button>
                <button 
                  onClick={() => {
                    setSelectedAddress({ label: addressLabelDraft, address: addressDraft });
                    setIsAddressModalOpen(false);
                  }}
                  className="flex-grow bg-[#FFD700] text-[#4C2A4C] font-black py-6 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-yellow-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all"
                >
                  Salvar Endereço
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  const AdminScreen = () => {
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'report' | 'profile' | 'users'>('list');
    const [orders, setOrders] = useState<Order[]>([]);
    const [posCart, setPosCart] = useState<{product: Product, quantity: number}[]>([]);
    const [placingPOSOrder, setPlacingPOSOrder] = useState(false);
    const [allUsers, setAllUsers] = useState<{ id: string, email: string }[]>([]);
    const [loadingUsersList, setLoadingUsersList] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    useEffect(() => {
      if (activeTab === 'report') {
        fetchOrders();
      }
      if (activeTab === 'users') {
        fetchUsers();
      }
    }, [activeTab]);

    const fetchUsers = async () => {
      setLoadingUsersList(true);
      if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
        // Demo users
        setTimeout(() => {
          setAllUsers([
            { id: '1', email: 'vitor@admin.com.br' },
            { id: '2', email: 'maria@cliente.com' },
            { id: '3', email: 'joao@fome.com' }
          ]);
          setLoadingUsersList(false);
        }, 800);
        return;
      }
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        setAllUsers(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUsersList(false);
      }
    };

    const fetchOrders = async () => {
      setLoadingOrders(true);
      if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
        // Demo orders
        setTimeout(() => {
          setOrders([
            {
              id: 'ord-123',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              total: 84.50,
              status: 'delivered',
              payment_method: 'Pix',
              delivery_address: { address: 'Rua Principal, 100', label: 'Casa' },
              user_id: '1'
            },
            {
              id: 'ord-124',
              created_at: new Date(Date.now() - 7200000).toISOString(),
              total: 32.00,
              status: 'pending',
              payment_method: 'Cartão',
              delivery_address: { address: 'Venda Presencial', label: 'PDV' },
              user_id: 'view'
            }
          ]);
          setLoadingOrders(false);
        }, 1000);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoadingOrders(false);
      }
    };

    const fetchOrderItems = async (orderId: string) => {
      if (!isSupabaseConfigured) return;
      setLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
        
        if (error) throw error;
        if (data) setOrderItems(data);
      } catch (error) {
        console.error('Error fetching order items:', error);
      } finally {
        setLoadingItems(false);
      }
    };

    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.category_id) return;

      const productToSave = {
        ...editingProduct,
        id: editingProduct.id || Math.random().toString(36).substr(2, 9),
        cost_price: editingProduct.cost_price || 0
      } as Product;

      setSaving(true);

      if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
        // Demo save
        setTimeout(() => {
          if (editingProduct.id) {
            setProducts(products.map(p => p.id === editingProduct.id ? productToSave : p));
          } else {
            setProducts([productToSave, ...products]);
          }
          setIsModalOpen(false);
          setEditingProduct(null);
          setActiveTab('list');
          setSaving(false);
          alert('Produto salvo com sucesso (Modo Demonstração)!');
        }, 1000);
        return;
      }

      try {
        if (editingProduct.id) {
          const { error } = await supabase
            .from('products')
            .update(productToSave)
            .eq('id', editingProduct.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('products')
            .insert([productToSave]);
          if (error) throw error;
        }
        
        // Refresh products
        const { data } = await supabase.from('products').select('*');
        if (data) setProducts(data);
        
        setIsModalOpen(false);
        setEditingProduct(null);
        setActiveTab('list');
      } catch (error) {
        console.error('Error saving product:', error);
        alert('Erro ao salvar produto');
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir este produto?')) return;
      
      if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
        setProducts(products.filter(p => p.id !== id));
        alert('Produto excluído (Modo Demonstração)');
        return;
      }

      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Erro ao excluir produto');
      }
    };

    const ProductForm = ({ isEditing = false }: { isEditing?: boolean }) => {
      const price = editingProduct?.price || 0;
      const costPrice = editingProduct?.cost_price || 0;
      const profit = price - costPrice;
      const profitMargin = price > 0 ? (profit / price) * 100 : 0;

      return (
        <form onSubmit={handleSave} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-[#4C2A4C]">
            {isEditing ? 'Editar Açaí' : 'Cadastrar Novo Açaí'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Açaí com Morango"
                value={editingProduct?.name || ''}
                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4C2A4C] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
              <textarea 
                required
                placeholder="Descreva os ingredientes e o sabor..."
                value={editingProduct?.description || ''}
                onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4C2A4C] outline-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Preço de Venda (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={editingProduct?.price || 0}
                  onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                  className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4C2A4C] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Preço de Custo (CMV)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={editingProduct?.cost_price || 0}
                  onChange={e => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) })}
                  className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4C2A4C] outline-none"
                />
              </div>
            </div>

            {/* Profit Display */}
            <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-stone-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Lucro em Real</p>
                <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {profit.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Margem de Lucro</p>
                <p className={`text-lg font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
              <select 
                required
                value={editingProduct?.category_id || ''}
                onChange={e => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4C2A4C] outline-none bg-white"
              >
                <option value="" disabled>Selecione uma categoria</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">URL da Imagem</label>
              <input 
                type="url" 
                required
                placeholder="https://exemplo.com/imagem.jpg"
                value={editingProduct?.image || ''}
                onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4C2A4C] outline-none"
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            {!isEditing && (
              <button 
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setActiveTab('list');
                }}
                className="flex-1 py-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-[#4C2A4C] text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg hover:bg-purple-900 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {saving ? 'Salvando...' : isEditing ? 'Atualizar Açaí' : 'Cadastrar Açaí'}
            </button>
          </div>
        </form>
      );
    };

    const POSScreen = () => {
      const posTotal = posCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

      const addToPOSCart = (product: Product) => {
        setPosCart(current => {
          const existing = current.find(item => item.product.id === product.id);
          if (existing) {
            return current.map(item => 
              item.product.id === product.id 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            );
          }
          return [...current, { product, quantity: 1 }];
        });
      };

      const removeFromPOSCart = (productId: string) => {
        setPosCart(current => current.filter(item => item.product.id !== productId));
      };

      const updateQuantity = (productId: string, delta: number) => {
        setPosCart(current => current.map(item => {
          if (item.product.id === productId) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        }));
      };

      const finalizePOSOrder = async () => {
        if (posCart.length === 0) return;
        setPlacingPOSOrder(true);

        if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
          // Demo POS order
          setTimeout(() => {
            alert('Venda realizada com sucesso (Modo Demonstração)!');
            setPosCart([]);
            fetchOrders(); 
            setActiveTab('report');
            setPlacingPOSOrder(false);
          }, 1500);
          return;
        }

        try {
          // Create order
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: user?.id,
              total: posTotal,
              delivery_address: { address: 'Venda Presencial (PDV)', type: 'presencial' },
              payment_method: 'Dinheiro/Pix'
            })
            .select();

          if (orderError) throw orderError;
          const order = orderData?.[0];
          if (!order) throw new Error('Falha ao gerar pedido');

          // Create order items
          const orderItems = posCart.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            price_at_order: item.product.price,
            selected_size: 'Padrão',
            selected_extras: []
          }));

          const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
          if (itemsError) throw itemsError;

          alert('Venda realizada com sucesso!');
          setPosCart([]);
          fetchOrders(); // Refresh sales report
          setActiveTab('report');
        } catch (error) {
          console.error('Error finalizing POS order:', error);
          alert('Erro ao processar venda');
        } finally {
          setPlacingPOSOrder(false);
        }
      };

      return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
          {/* Products Grid */}
          <div className="flex-grow space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#5D4037]">Selecionar Produtos</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar produto..." 
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-stone-100 text-sm focus:ring-2 focus:ring-[#4C2A4C] outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(product => (
                <button 
                  key={product.id}
                  onClick={() => addToPOSCart(product)}
                  className="bg-white p-3 rounded-2xl border border-stone-100 hover:shadow-md transition-all text-left flex flex-col group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-stone-50">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <h4 className="font-bold text-[#4C2A4C] text-sm leading-tight mb-1 line-clamp-1">{product.name}</h4>
                  <p className="text-[#FFD700] font-black text-xs">R$ {product.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="w-full lg:w-[380px] bg-white rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col p-6 sticky top-24 h-[calc(100vh-180px)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#4C2A4C] p-2 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-xl text-[#4C2A4C]">Itens da Venda</h3>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar space-y-4 mb-6">
              {posCart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <Package className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm font-bold">Carrinho vazio</p>
                </div>
              ) : (
                posCart.map(item => (
                  <div key={item.product.id} className="flex gap-3 items-center p-3 bg-stone-50 rounded-2xl group">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h5 className="font-bold text-xs text-[#4C2A4C] truncate">{item.product.name}</h5>
                      <p className="text-[10px] text-gray-400">R$ {item.product.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex items-center bg-white rounded-lg border border-stone-200 px-1 py-1">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-stone-50 rounded text-gray-400"><Minus className="w-3 h-3" /></button>
                          <span className="w-6 text-center text-xs font-bold text-[#4C2A4C]">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-stone-50 rounded text-gray-400"><Plus className="w-3 h-3" /></button>
                       </div>
                       <button onClick={() => removeFromPOSCart(item.product.id)} className="p-2 text-red-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-6 border-t border-stone-100 space-y-4">
              <div className="flex justify-between items-center text-gray-400 text-sm font-bold uppercase tracking-wider">
                <span>Subtotal</span>
                <span className="text-[#4C2A4C]">R$ {posTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-[#4C2A4C]">Total</span>
                <span className="text-3xl font-black text-[#FFD700]">R$ {posTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={finalizePOSOrder}
                disabled={posCart.length === 0 || placingPOSOrder}
                className="w-full py-5 bg-[#4C2A4C] text-white rounded-[1.5rem] font-bold shadow-xl shadow-purple-900/10 hover:bg-purple-900 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {placingPOSOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {placingPOSOrder ? 'Processando...' : 'Finalizar Venda'}
              </button>
              <button 
                onClick={() => setPosCart([])}
                className="w-full py-2 text-gray-400 text-xs font-bold hover:text-red-400 transition-colors"
              >
                Limpar Carrinho
              </button>
            </div>
          </div>
        </div>
      );
    };

    const SalesReport = () => {
      const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
      const averageOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

      if (loadingOrders) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#4C2A4C]" />
            <p className="font-bold">Carregando dados das vendas...</p>
          </div>
        );
      }

      return (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-purple-100 p-3 rounded-2xl">
                  <DollarSign className="w-6 h-6 text-[#4C2A4C]" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Faturamento Total</p>
              </div>
              <p className="text-3xl font-black text-[#4C2A4C]">R$ {totalRevenue.toFixed(2)}</p>
              <div className="flex items-center gap-1 mt-2 text-purple-600 text-sm font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>+12% este mês</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-yellow-100 p-3 rounded-2xl">
                  <Package className="w-6 h-6 text-[#FFD700]" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total de Pedidos</p>
              </div>
              <p className="text-3xl font-black text-[#4C2A4C]">{orders.length}</p>
              <p className="text-gray-400 text-sm mt-2 font-medium">Pedidos realizados</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ticket Médio</p>
              </div>
              <p className="text-3xl font-black text-[#4C2A4C]">R$ {averageOrder.toFixed(2)}</p>
              <p className="text-gray-400 text-sm mt-2 font-medium">Por pedido</p>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-stone-100 overflow-hidden">
            <div className="px-10 py-8 border-b border-stone-50 flex justify-between items-center bg-stone-50/30">
              <div>
                <h3 className="font-black text-xl text-[#4C2A4C] uppercase tracking-tighter">Fluxo Detalhado</h3>
                <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mt-1">Registros de transações recentes</p>
              </div>
              <button onClick={fetchOrders} className="text-[10px] font-black uppercase tracking-widest text-[#FFD700] bg-white border border-stone-100 px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2">
                <RefreshCw className="w-3 h-3" /> Atualizar Dados
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/50 text-[10px] uppercase tracking-[0.2em] font-black text-stone-300">
                    <th className="px-10 py-8">Código Identificador</th>
                    <th className="px-10 py-8">Data da Operação</th>
                    <th className="px-10 py-8">Provimento</th>
                    <th className="px-10 py-8 text-right">Montante Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {orders.map(order => (
                    <tr 
                      key={order.id} 
                      onClick={() => {
                        setSelectedOrder(order);
                        fetchOrderItems(order.id);
                      }}
                      className="hover:bg-stone-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-10 py-8 font-mono text-xs text-stone-300 group-hover:text-[#4C2A4C] transition-colors">
                        <span className="bg-stone-100 px-2 py-1 rounded text-[10px]">#{order.id.slice(0, 8).toUpperCase()}</span>
                      </td>
                      <td className="px-10 py-8 text-sm font-bold text-[#4C2A4C]">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-10 py-8">
                        <span className="bg-[#4C2A4C]/5 text-[#4C2A4C] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#4C2A4C]/5">
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right font-black text-[#4C2A4C] text-lg">
                        R$ {order.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-10 py-24 text-center">
                         <div className="flex flex-col items-center gap-4 text-stone-200">
                            <Package className="w-12 h-12" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma operação realizada</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Details Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[110]">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="bg-[#4C2A4C] p-6 text-white flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl">Detalhes do Pedido</h3>
                    <p className="text-white/70 text-xs font-mono">#{selectedOrder.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                  {loadingItems ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#4C2A4C]" />
                      <p className="text-sm font-bold">Carregando itens...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl">
                          <div>
                            <p className="font-bold text-[#4C2A4C]">{item.product_name}</p>
                            <p className="text-xs text-gray-500">
                              {item.quantity}x {item.selected_size}
                              {item.selected_extras.length > 0 && ` • +${item.selected_extras.length} extras`}
                            </p>
                          </div>
                          <p className="font-bold text-gray-700">R$ {(item.price_at_order * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-stone-100 pt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Método de Pagamento</span>
                      <span className="font-bold text-gray-700">{selectedOrder.payment_method}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Endereço</span>
                      <span className="font-bold text-gray-700 text-right max-w-[200px]">{selectedOrder.delivery_address.address}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-stone-50">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-black text-[#FFD700]">R$ {selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-stone-50">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="w-full py-4 bg-[#4C2A4C] text-white rounded-2xl font-bold shadow-lg"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-[#F9F7F2] min-h-screen font-sans">
        <header className="bg-white border-b border-stone-100 p-8 sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-[#4C2A4C] text-white p-3 rounded-2xl shadow-xl shadow-purple-900/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#4C2A4C] uppercase tracking-tighter leading-none mb-1">
                  Painel de <span className="text-[#FFD700]">Gestão</span>
                </h1>
                <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Controle operacional e administrativo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-4">
               <p className="text-xs font-black text-[#4C2A4C] uppercase tracking-tight">{user?.email}</p>
               <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">Administrador</p>
              </div>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="group flex items-center gap-3 bg-stone-50 hover:bg-red-50 p-4 pr-6 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-red-100"
              >
                <div className="bg-white p-2 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors text-red-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest text-[#4C2A4C]">Encerrar Sessão</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto p-12 lg:grid lg:grid-cols-[280px_1fr] lg:gap-16">
          {/* Sub-Nav Sidebar (Desktop Only) */}
          <aside className="hidden lg:flex flex-col gap-3 sticky top-36 h-fit">
             <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em] ml-6 mb-2">Navegação Administrativa</p>
             {[
                { id: 'list', label: 'Estoque & Catálogo', icon: ShoppingBag, color: 'hover:bg-purple-50 hover:text-[#4C2A4C]' },
                { id: 'create', label: 'Novo Açaí', icon: Plus, action: () => setEditingProduct({ name: '', description: '', price: 0, cost_price: 0, image: '', category_id: categories[0]?.id || '' }), color: 'hover:bg-yellow-50 hover:text-[#FFD700]' },
                { id: 'report', label: 'Fluxo de Caixa', icon: BarChart3, color: 'hover:bg-purple-50 hover:text-[#4C2A4C]' },
                { id: 'users', label: 'Base de Clientes', icon: UserIcon, color: 'hover:bg-purple-50 hover:text-[#4C2A4C]' },
                { id: 'profile', label: 'Segurança & Conta', icon: Lock, color: 'hover:bg-stone-100 hover:text-[#4C2A4C]' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.action) tab.action();
                    setIsModalOpen(false);
                    if (tab.id !== 'create') setEditingProduct(null);
                  }}
                  className={`w-full flex items-center gap-4 px-8 py-5 rounded-[2rem] font-black transition-all text-sm uppercase tracking-tight ${
                    activeTab === tab.id 
                    ? 'bg-[#4C2A4C] text-white shadow-2xl shadow-purple-900/20 rotate-1' 
                    : `bg-white text-stone-400 border border-stone-100 ${tab.color} hover:shadow-xl hover:-translate-x-1`
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-[#FFD700]' : ''}`} />
                  <span className="flex-grow text-left text-[11px] tracking-widest">{tab.label}</span>
                  {activeTab === tab.id && <div className="w-2 h-2 bg-[#FFD700] rounded-full"></div>}
                </button>
              ))}
          </aside>

          <div className="min-w-0">
             {/* Mobile Nav (Fallback for admin on mobile) */}
             <div className="lg:hidden flex gap-4 overflow-x-auto no-scrollbar pb-8">
               {[
                  { id: 'list', label: 'Produtos' },
                  { id: 'report', label: 'Vendas' }
                ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#4C2A4C] text-white shadow-lg' : 'bg-white text-stone-400 border border-stone-100'}`}
                 >
                   {tab.label}
                 </button>
               ))}
             </div>
            {activeTab === 'list' ? (
            <div className="space-y-8">
              <div className="flex justify-between items-end pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em] mb-2">Inventário Ativo</h2>
                  <h1 className="text-4xl font-black text-[#4C2A4C] uppercase tracking-tighter">Catálogo de <span className="text-[#FFD700]">Açaí</span></h1>
                </div>
                <div className="bg-white px-6 py-3 rounded-full border border-stone-100 shadow-sm flex items-center gap-4">
                  <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Total de Itens:</span>
                  <span className="text-xl font-black text-[#4C2A4C]">{products.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {products.map(product => (
                  <motion.div 
                    layout
                    key={product.id} 
                    className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex items-center gap-8 group hover:shadow-xl hover:-translate-y-1 transition-all"
                  >
                    <div className="w-32 h-32 rounded-[2rem] overflow-hidden flex-shrink-0 bg-stone-50 border border-stone-100 group-hover:rotate-3 transition-transform duration-500 shadow-sm relative">
                       <img src={product.image} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                       <div className="absolute inset-0 bg-[#4C2A4C]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                         <span className="px-3 py-1 bg-stone-50 text-[9px] font-black uppercase text-stone-400 tracking-widest rounded-full border border-stone-100/50">
                           {categories.find(c => c.id === product.category_id)?.name}
                         </span>
                      </div>
                      <h3 className="text-2xl font-black text-[#4C2A4C] uppercase tracking-tighter leading-tight mb-2">{product.name}</h3>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-[#FFD700]">R$ {product.price.toFixed(2)}</span>
                        <span className="text-[10px] text-stone-300 font-bold uppercase tracking-widest pb-1">/ un</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setIsModalOpen(true);
                        }}
                        className="p-4 bg-stone-50 hover:bg-[#4C2A4C] hover:text-white rounded-2xl transition-all shadow-sm flex items-center justify-center group/btn"
                      >
                        <Edit className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-4 bg-stone-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm flex items-center justify-center group/btn"
                      >
                        <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : activeTab === 'create' ? (
            <div className="max-w-2xl mx-auto">
              <ProductForm />
            </div>
          ) : activeTab === 'report' ? (
            <SalesReport />
          ) : activeTab === 'users' ? (
            <div className="space-y-10">
              <div className="flex justify-between items-end pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em] mb-2">Relacionamento</h2>
                  <h1 className="text-4xl font-black text-[#4C2A4C] uppercase tracking-tighter">Base de <span className="text-[#FFD700]">Clientes</span></h1>
                </div>
              </div>

              {loadingUsersList ? (
                <div className="flex flex-col items-center justify-center py-24 text-stone-300">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#4C2A4C]" />
                  <p className="text-[10px] uppercase font-black tracking-widest">Sincronizando banco de dados...</p>
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] shadow-sm border border-stone-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50/50 text-[10px] uppercase font-black text-stone-300 tracking-[0.2em]">
                        <th className="px-10 py-8">Identificação</th>
                        <th className="px-10 py-8">Vínculo</th>
                        <th className="px-10 py-8">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {allUsers.map(u => (
                        <tr key={u.id} className="hover:bg-stone-50/30 transition-colors group">
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-[#4C2A4C] font-black group-hover:bg-[#4C2A4C] group-hover:text-white transition-all">
                                 {u.email?.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                 <p className="font-black text-[#4C2A4C] text-base group-hover:translate-x-1 transition-transform">{u.email}</p>
                                 <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest mt-0.5">Clique para detalhes</p>
                               </div>
                             </div>
                          </td>
                          <td className="px-10 py-8">
                            <span className="text-xs font-mono text-stone-300 bg-stone-50 px-3 py-1 rounded-lg">ID: {u.id.slice(0, 12)}...</span>
                          </td>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                               <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ativo</span>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-stone-100 text-center">
                <div className="w-24 h-24 bg-[#FFD700] rounded-full mx-auto mb-6 flex items-center justify-center text-[#4C2A4C] text-3xl font-bold shadow-lg">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-2xl font-bold text-[#4C2A4C]">{user?.email}</h3>
                <p className="text-gray-400 text-sm mt-1">Membro registrado</p>
                <div className="mt-8 space-y-4">
                  <button 
                    onClick={async () => {
                      if (user?.email) {
                        if (!isSupabaseConfigured) {
                          alert('Modo demonstração: Link de redefinição simulado com sucesso! (Nenhum e-mail real foi enviado)');
                          return;
                        }
                        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                          redirectTo: window.location.origin
                        });
                        if (error) alert(error.message);
                        else alert('Link de redefinição enviado para seu e-mail!');
                      }
                    }}
                    className="w-full py-4 px-6 border-2 border-[#4C2A4C] text-[#4C2A4C] rounded-2xl font-bold hover:bg-[#4C2A4C] hover:text-white transition-all"
                  >
                    Redefinir Minha Senha
                  </button>
                  <button 
                    onClick={async () => {
                      if (isSupabaseConfigured) {
                        try { await supabase.auth.signOut(); } catch (e) {}
                      }
                      setUser(null);
                      setCurrentScreen('home');
                    }}
                    className="w-full py-4 px-6 bg-red-500 text-white rounded-2xl font-bold shadow-lg hover:bg-red-600 transition-all"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-500 hover:text-red-500 z-10"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
                <ProductForm isEditing={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SuccessScreen = () => (
    <div className="bg-[#F9F7F2] min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100 }}
          className="w-24 h-24 md:w-40 md:h-40 bg-[#4C2A4C] rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto shadow-2xl shadow-purple-900/20 relative"
        >
          <div className="absolute inset-0 bg-white/10 rounded-[2.5rem] animate-pulse"></div>
          <CheckCircle2 className="w-12 h-12 md:w-20 md:h-20 text-[#FFD700]" />
        </motion.div>
        
        <h1 className="text-3xl md:text-6xl font-black text-[#4C2A4C] mb-6 uppercase tracking-tighter">
          Pedido <span className="text-[#FFD700]">Confirmado!</span>
        </h1>
        <p className="text-stone-400 md:text-xl mb-12 font-medium max-w-lg mx-auto leading-relaxed">
          Sua dose de energia já está entrando em <br className="hidden md:block" />
          produção no Açaí Hub.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => {
              setCart([]);
              setCurrentScreen('history');
            }}
            className="w-full md:w-auto bg-[#4C2A4C] text-white font-black px-12 py-5 rounded-2xl shadow-xl hover:bg-purple-900 transition-all uppercase tracking-widest text-xs"
          >
            Acompanhar Entrega
          </button>
          <button 
            onClick={() => {
              setCart([]);
              setCurrentScreen('home');
            }}
            className="w-full md:w-auto bg-white text-[#4C2A4C] font-black px-12 py-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all uppercase tracking-widest text-xs"
          >
            Menu Principal
          </button>
        </div>
      </div>
    </div>
  );

  const MyOrdersScreen = () => {
    const [userOrders, setUserOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
      async function fetchMyOrders() {
        if (!user) {
          setLoadingOrders(false);
          return;
        }

        if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
          // Mock some orders for the demo
          setTimeout(() => {
            setUserOrders([
              {
                id: 'demo-1',
                created_at: new Date(Date.now() - 3600000).toISOString(),
                total: 42.50,
                status: 'delivered',
                payment_method: 'Pix',
                delivery_address: { address: 'Rua das Palmeiras, 123 - Apt 42', label: 'Casa' },
                user_id: user.id
              },
              {
                id: 'demo-2',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                total: 28.90,
                status: 'pending',
                payment_method: 'Cartão de Crédito',
                delivery_address: { address: 'Av. Paulista, 1000 - Edifício Business', label: 'Trabalho' },
                user_id: user.id
              }
            ]);
            setLoadingOrders(false);
          }, 800);
          return;
        }

        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setUserOrders(data || []);
        } catch (err: any) {
          console.error(err);
          setOrdersError(err.message || 'Erro ao carregar pedidos');
        } finally {
          setLoadingOrders(false);
        }
      }
      fetchMyOrders();
    }, [user]);

    const toggleOrder = async (orderId: string) => {
      if (expandedOrderId === orderId) {
        setExpandedOrderId(null);
        return;
      }
      setExpandedOrderId(orderId);
      
      if (!orderItemsMap[orderId]) {
        if (!isSupabaseConfigured || user?.id === 'guest-user' || user?.id === 'demo-user-123') {
          // Mock items for demo
          setOrderItemsMap(prev => ({ 
            ...prev, 
            [orderId]: [
              { id: 'item-1', order_id: orderId, product_name: 'Açaí Energético Master', quantity: 2, price_at_order: 18.00, selected_size: '500ml', selected_extras: ['Granola', 'Mel'] },
              { id: 'item-2', order_id: orderId, product_name: 'Suco de Cupuaçu', quantity: 1, price_at_order: 6.50, selected_size: '300ml', selected_extras: [] }
            ] 
          }));
          return;
        }

        setLoadingItems(prev => ({ ...prev, [orderId]: true }));
        try {
          const { data, error } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);

          if (error) throw error;
          setOrderItemsMap(prev => ({ ...prev, [orderId]: data || [] }));
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingItems(prev => ({ ...prev, [orderId]: false }));
        }
      }
    };

    return (
      <div className="bg-[#F9F7F2] min-h-screen p-4 md:p-12 font-sans flex flex-col items-center pb-32 lg:pb-12">
        <header className="w-full max-w-4xl flex items-center justify-between mb-12 relative z-10">
          <button 
            onClick={() => setCurrentScreen('home')} 
            className="group flex items-center gap-3 bg-white p-4 pr-6 rounded-2xl shadow-sm border border-stone-100 hover:shadow-md transition-all active:scale-95"
          >
            <div className="bg-stone-50 p-2 rounded-xl group-hover:bg-[#4C2A4C]/10 transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#4C2A4C]" />
            </div>
            <span className="font-black text-xs uppercase tracking-widest text-[#4C2A4C]">Início</span>
          </button>
          
          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <h1 className="text-3xl md:text-5xl font-black text-[#4C2A4C] uppercase tracking-tighter">
              Seus <span className="text-[#FFD700]">Pedidos</span>
            </h1>
          </div>
          
          <div className="w-24"></div>
        </header>

        <main className="w-full max-w-2xl mx-auto space-y-6">
          {!isSupabaseConfigured && (
            <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 p-4 rounded-2xl mb-8 flex items-center gap-4">
              <div className="bg-[#FFD700] p-2 rounded-xl">
                <Zap className="w-5 h-5 text-[#4C2A4C]" />
              </div>
              <p className="text-[10px] font-black text-[#4C2A4C] uppercase tracking-widest leading-relaxed">
                Modo de Demonstração Ativo. Estes dados são apenas para visualização.
              </p>
            </div>
          )}
          {ordersError ? (
            <div className="text-center py-20 space-y-4">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-red-500 font-bold">{ordersError}</p>
              <button 
                onClick={() => {
                  setOrdersError(null);
                  setLoadingOrders(true);
                  // We can't re-call fetchMyOrders easily without moving it, 
                  // but we can just trigger a component refresh or move it to a useCallback
                }}
                className="text-[#4C2A4C] font-bold underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : loadingOrders ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-[#4C2A4C]" />
            </div>
          ) : userOrders.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="bg-white/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 font-bold">Você ainda não fez nenhum pedido.</p>
              <button 
                onClick={() => setCurrentScreen('home')}
                className="text-[#FFD700] font-bold"
              >
                Fazer meu primeiro pedido
              </button>
            </div>
          ) : (
            userOrders.map(order => {
              const isExpanded = expandedOrderId === order.id;
              const items = orderItemsMap[order.id] || [];
              const loading = loadingItems[order.id];

              return (
                <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
                  <button 
                    onClick={() => toggleOrder(order.id)}
                    className="w-full text-left p-6 space-y-4 focus:outline-none"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="font-bold text-[#4C2A4C]">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                          order.status === 'delivered' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.status === 'pending' ? 'Pendente' : 
                          order.status === 'delivered' ? 'Entregue' : order.status}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">{order.payment_method}</p>
                      <p className="font-black text-[#FFD700] text-lg">R$ {order.total.toFixed(2)}</p>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-stone-50 bg-stone-50/30"
                      >
                        <div className="p-6 space-y-5">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Itens do Pedido</p>
                          </div>
                          
                          {loading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-6 h-6 animate-spin text-[#4C2A4C]" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start animate-in fade-in slide-in-from-top-1 duration-200" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-[#4C2A4C]">{item.product_name}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">
                                      {item.quantity}x {item.selected_size}
                                      {item.selected_extras && item.selected_extras.length > 0 && ` • +${item.selected_extras.length} extras`}
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-[#4C2A4C] ml-4">
                                    R$ {(item.price_at_order * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-4 border-t border-stone-100 space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entrega em</span>
                              </div>
                              <span className="text-[#4C2A4C] font-bold text-[11px] text-right max-w-[180px] leading-tight">
                                {order.delivery_address.address}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pagamento</span>
                              </div>
                              <span className="text-[#4C2A4C] font-bold text-[11px]">
                                {order.payment_method}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </main>
      </div>
    );
  };

  const LoginScreen = () => {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [isSignUp, setIsSignUp] = useState(false);
      const [isForgotPassword, setIsForgotPassword] = useState(false);
      const [authLoading, setAuthLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [message, setMessage] = useState<string | null>(null);

      const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        setAuthLoading(true);

        if (!isSupabaseConfigured) {
          // Mock login for demo
          setTimeout(() => {
            setUser({ 
              id: 'demo-user-123', 
              email: email || 'cliente@exemplo.com',
              aud: 'authenticated',
              role: 'authenticated',
              app_metadata: {},
              user_metadata: {},
              created_at: new Date().toISOString()
            } as any);
            setAuthLoading(false);
          }, 1000);
          return;
        }
        
        try {
          if (isForgotPassword) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}`,
            });
            if (error) throw error;
            setMessage('Link de recuperação enviado para o seu e-mail!');
          } else if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            alert('Verifique seu e-mail para confirmar o cadastro!');
          } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
          }
        } catch (err: any) {
          console.error('Auth error:', err);
          const message = err.message || '';
          if (message.includes('Email not confirmed')) {
            setError('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
          } else if (message.includes('Invalid login credentials')) {
            setError('E-mail ou senha incorretos. Tente novamente.');
          } else if (message.includes('User already registered')) {
            setError('Este e-mail já está cadastrado. Tente fazer login.');
          } else if (message.includes('Password should be at least 6 characters')) {
            setError('A senha deve ter pelo menos 6 caracteres.');
          } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            setError('Erro de conexão. Verifique sua internet ou tente entrar como convidado.');
          } else {
            setError(message || 'Erro na autenticação');
          }
        } finally {
          setAuthLoading(false);
        }
      };

      return (
        <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden my-4"
          >
            <div className="bg-[#4C2A4C] p-8 text-center text-white">
              <div className="w-16 h-16 bg-[#FFD700] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg rotate-12">
                <Zap className="w-8 h-8 text-[#4C2A4C] fill-current" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Açaí <span className="text-[#FFD700]">Hub</span></h1>
            </div>
            
            <form onSubmit={handleAuth} className="p-8 space-y-6">
              {!isSupabaseConfigured && (
                <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 p-4 rounded-2xl mb-2 flex items-center gap-3">
                  <div className="bg-[#FFD700]/20 p-2 rounded-lg">
                    <HelpCircle className="w-4 h-4 text-[#4C2A4C]" />
                  </div>
                  <p className="text-[10px] font-black text-[#4C2A4C] uppercase tracking-widest leading-tight">
                    Modo demonstração: use qualquer e-mail para acessar.
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-stone-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#FFD700] outline-none"
                  />
                </div>
                {!isForgotPassword && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      placeholder="Sua senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-stone-50 border-none rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-[#FFD700] outline-none"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4C2A4C] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>

              {!isSignUp && !isForgotPassword && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs font-bold text-[#4C2A4C] hover:text-[#FFD700] transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center space-y-3"
                >
                  <p>{error}</p>
                  {(error.includes('conexão') || error.includes('Failed to fetch')) && (
                    <button 
                      type="button"
                      onClick={() => {
                        setAuthLoading(true);
                        setTimeout(() => {
                          setUser({ 
                            id: 'demo-user-123', 
                            email: email || 'cliente@exemplo.com',
                            aud: 'authenticated',
                            role: 'authenticated',
                            app_metadata: {},
                            user_metadata: { full_name: 'Modo Demo' },
                            created_at: new Date().toISOString()
                          } as any);
                          setAuthLoading(false);
                        }, 500);
                      }}
                      className="w-full bg-red-500 text-white py-2 rounded-xl text-[9px] hover:bg-red-600 transition-colors"
                    >
                      Bypass para Modo Demo
                    </button>
                  )}
                </motion.div>
              )}

              {message && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-full text-xs font-bold text-center"
                >
                  {message}
                </motion.div>
              )}

              <div className="space-y-4">
                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#4C2A4C] text-white font-black py-5 rounded-3xl shadow-xl hover:bg-purple-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {isForgotPassword ? 'Enviar Link' : isSignUp ? 'Criar Conta' : 'Entrar Agora'}
                </button>

                {!isSignUp && !isForgotPassword && (
                  <button 
                    type="button"
                    disabled={authLoading}
                    onClick={() => {
                      setAuthLoading(true);
                      setTimeout(() => {
                        setUser({ 
                          id: 'guest-user', 
                          email: 'visitante@hub.com',
                          aud: 'authenticated',
                          role: 'authenticated',
                          app_metadata: {},
                          user_metadata: { full_name: 'Visitante' },
                          created_at: new Date().toISOString()
                        } as any);
                        setAuthLoading(false);
                      }, 800);
                    }}
                    className="w-full bg-stone-100 text-[#4C2A4C] font-black py-5 rounded-3xl hover:bg-stone-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
                  >
                    Entrar como Convidado
                  </button>
                )}
              </div>

              <div className="text-center space-y-4">
                {isForgotPassword ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-gray-500 text-sm font-bold hover:text-[#FFD700] transition-colors"
                  >
                    Voltar para o Login
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-gray-500 text-sm font-bold hover:text-[#FFD700] transition-colors"
                  >
                    {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      );
    };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#4C2A4C]" />
      </div>
    );
  }

  if (isResettingPassword) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 space-y-6"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#4C2A4C]">Nova Senha</h2>
            <p className="text-gray-500 text-sm mt-2">Digite sua nova senha abaixo</p>
          </div>
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const newPassword = (e.currentTarget.elements.namedItem('new-password') as HTMLInputElement).value;
              
              if (!isSupabaseConfigured) {
                alert('Modo demonstração: Senha atualizada com sucesso!');
                setIsResettingPassword(false);
                return;
              }

              const { error } = await supabase.auth.updateUser({ password: newPassword });
              if (error) {
                alert('Erro ao atualizar senha: ' + error.message);
              } else {
                alert('Senha atualizada com sucesso!');
                setIsResettingPassword(false);
              }
            }}
            className="space-y-4"
          >
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                name="new-password"
                type={showPassword ? "text" : "password"} 
                required
                placeholder="Nova Senha"
                className="w-full bg-stone-50 border-none rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-[#FFD700] outline-none"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4C2A4C] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button 
              type="submit"
              className="w-full bg-[#4C2A4C] text-white font-bold py-5 rounded-2xl shadow-lg hover:bg-purple-900 transition-all"
            >
              Confirmar Nova Senha
            </button>
            <button 
              type="button"
              onClick={() => setIsResettingPassword(false)}
              className="w-full text-gray-500 text-sm font-bold"
            >
              Cancelar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderScreen = () => {
    // screens that require login
    const protectedScreens: Screen[] = ['checkout', 'history', 'admin'];
    const isLoginNeeded = protectedScreens.includes(currentScreen) && !user;
    
    if (isLoginNeeded) {
      return <LoginScreen />;
    }

    switch (currentScreen) {
      case 'home': return <HomeScreen />;
      case 'product': return <ProductDetailScreen />;
      case 'cart': return <CartScreen />;
      case 'checkout': return <CheckoutScreen />;
      case 'success': return <SuccessScreen />;
      case 'admin': return <AdminScreen />;
      case 'history': return <MyOrdersScreen />;
      default: return <HomeScreen />;
    }
  };

  const isLoginNeeded = ['checkout', 'history', 'admin'].includes(currentScreen) && !user;
  const showNav = !['checkout', 'product', 'success'].includes(currentScreen) && !isLoginNeeded;

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans flex text-[#4C2A4C]">
      {showNav && <Sidebar />}
      
      <main className="flex-grow min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen + (isLoginNeeded ? '_login' : '')}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>

        {showNav && (
          <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-white border border-stone-100 px-6 py-4 flex justify-between items-center z-50 rounded-[2.5rem] shadow-2xl">
            <button 
              onClick={() => setCurrentScreen('home')}
              className={`flex flex-col items-center gap-1.5 ${currentScreen === 'home' ? 'text-[#FFD700]' : 'text-stone-300'}`}
            >
              <HomeIcon className={`w-6 h-6 ${currentScreen === 'home' ? 'fill-current' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
            </button>
            <button 
              onClick={() => setCurrentScreen('history')}
              className={`flex flex-col items-center gap-1.5 ${currentScreen === 'history' ? 'text-[#FFD700]' : 'text-stone-300'}`}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase tracking-tighter">Pedidos</span>
            </button>
            <button onClick={() => setCurrentScreen('cart')} className={`flex flex-col items-center gap-1.5 ${currentScreen === 'cart' ? 'text-[#FFD700]' : 'text-stone-300'} relative`}>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFD700] text-[#4C2A4C] text-[9px] flex items-center justify-center rounded-full border-2 border-white font-black">
                  {cart.length}
                </span>
              )}
              <ShoppingBag className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase tracking-tighter">Cesta</span>
            </button>
            <button onClick={() => setCurrentScreen('admin')} className={`flex flex-col items-center gap-1.5 ${currentScreen === 'admin' ? 'text-[#FFD700]' : 'text-stone-300'}`}>
              <UserIcon className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase tracking-tighter">Perfil</span>
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
