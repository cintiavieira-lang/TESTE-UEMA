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
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, Category, Extra, Order, OrderItem } from './types';
import { PRODUCTS as STATIC_PRODUCTS, CATEGORIES as STATIC_CATEGORIES, EXTRAS, ADDONS } from './constants';
import { supabase } from './lib/supabase';
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
  
  // Auth State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Supabase State
  const [products, setProducts] = useState<Product[]>(STATIC_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
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
    const deliveryFee = subtotal > 0 ? 2.99 : 0;
    const tax = subtotal * 0.08;
    return {
      subtotal,
      deliveryFee,
      tax,
      total: subtotal + deliveryFee + tax
    };
  }, [cart]);

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
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total: cartTotal.total,
          delivery_address: {
            label: 'Casa',
            address: 'Av. Paulista, 1000 - Apartamento 42, Bela Vista, São Paulo - SP'
          },
          payment_method: 'Cartão de Crédito'
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

  const HomeScreen = () => (
    <div className="bg-[#F5F5DC] min-h-screen pb-24">
      <header className="bg-[#1B4D3E] p-6 md:p-12 rounded-b-[2rem] md:rounded-b-[4rem] shadow-lg text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-white/70 text-sm">Entrega em</p>
              <h1 className="font-bold text-lg md:text-2xl flex items-center gap-1">
                <MapPin className="w-4 h-4 md:w-6 md:h-6 text-[#FF8C00]" />
                Casa, Centro
              </h1>
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-[#FF8C00] border-2 border-white overflow-hidden">
              <img src="https://picsum.photos/seed/user/100/100" alt="Usuário" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Busque seu Guaraná favorito..." 
              className="w-full bg-white text-gray-800 pl-10 pr-4 py-3 md:py-4 rounded-2xl border-none focus:ring-2 focus:ring-[#FF8C00]"
            />
          </div>
        </div>
      </header>

      <main className="mt-8 px-6 md:px-12 max-w-7xl mx-auto space-y-12">
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-xl md:text-3xl text-[#5D4037]">Categorias</h2>
            <button className="text-[#FF8C00] text-sm md:text-base font-semibold">Ver Tudo</button>
          </div>
          <div className="flex gap-4 md:gap-8 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <div key={cat.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-2xl md:rounded-3xl shadow-sm flex items-center justify-center border-2 border-transparent hover:border-[#2D8B57]/20 transition-all cursor-pointer">
                  <span className="text-2xl md:text-4xl">{cat.icon}</span>
                </div>
                <span className="text-xs md:text-sm font-bold text-[#5D4037]">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-xl md:text-3xl text-[#5D4037]">Misturas em Destaque</h2>
            <span className="bg-[#FF8C00] text-white text-[10px] md:text-xs px-2 py-1 md:px-3 md:py-1.5 rounded-full uppercase font-bold">Novo Verão</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-[#1B4D3E]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.filter(p => p.tags?.includes('New Summer') || p.id === '2' || p.id.length > 10).map(product => (
                <motion.div 
                  key={product.id}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ y: -5 }}
                  onClick={() => openProduct(product)}
                  className="bg-white rounded-[2.5rem] p-4 shadow-md flex items-center overflow-hidden border border-gray-100 cursor-pointer h-full"
                >
                  <div className="w-1/2 pr-4">
                    <h3 className="font-bold text-[#1B4D3E] text-lg md:text-xl leading-tight mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#FF8C00] text-lg md:text-xl">${product.price.toFixed(2)}</span>
                      <button className="bg-[#1B4D3E] text-white rounded-full p-2">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="w-1/2 h-32 md:h-40">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-xl md:text-3xl text-[#5D4037] mb-6">Adicionais Populares</h2>
          <div className="flex gap-4 md:gap-8 overflow-x-auto pb-4 no-scrollbar">
            {ADDONS.map((addon, i) => (
              <div key={i} className="min-w-[140px] md:min-w-[200px] bg-white p-3 md:p-6 rounded-3xl shadow-sm text-center">
                <img src={addon.image} alt={addon.name} className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-2 md:mb-4 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <p className="text-sm md:text-lg font-bold text-[#5D4037]">{addon.name}</p>
                <p className="text-[#FF8C00] font-bold text-xs md:text-sm">+${addon.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between items-center z-50 rounded-t-3xl shadow-2xl max-w-2xl mx-auto md:mb-6 md:rounded-full md:border md:shadow-lg">
        <button 
          onClick={() => setCurrentScreen('home')}
          className={`flex flex-col items-center gap-1 ${currentScreen === 'home' ? 'text-[#FF8C00]' : 'text-gray-400'}`}
        >
          <HomeIcon className={`w-6 h-6 ${currentScreen === 'home' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold">Fazer Pedidos</span>
        </button>
        <button 
          onClick={() => setCurrentScreen('history')}
          className={`flex flex-col items-center gap-1 ${currentScreen === 'history' ? 'text-[#FF8C00]' : 'text-gray-400'}`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-bold">Meus Pedidos</span>
        </button>
        <button onClick={() => setCurrentScreen('cart')} className={`flex flex-col items-center gap-1 ${currentScreen === 'cart' ? 'text-[#FF8C00]' : 'text-gray-400'} relative`}>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF8C00] text-white text-[8px] flex items-center justify-center rounded-full border border-white">
              {cart.length}
            </span>
          )}
          <ShoppingBag className="w-6 h-6" />
          <span className="text-[10px] font-bold">Carrinho</span>
        </button>
        <button onClick={() => setCurrentScreen('admin')} className={`flex flex-col items-center gap-1 ${currentScreen === 'admin' ? 'text-[#FF8C00]' : 'text-gray-400'}`}>
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Admin</span>
        </button>
      </nav>
    </div>
  );

  const ProductDetailScreen = () => {
    if (!selectedProduct) return null;
    return (
      <div className="bg-white min-h-screen pb-32">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2 -ml-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold">Produto</h1>
            <button onClick={() => setCurrentScreen('cart')} className="p-2 -mr-2 relative">
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF8C00] text-white text-[8px] flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto md:flex md:gap-12 md:p-12">
          <div className="relative w-full h-80 md:h-[600px] md:w-1/2 bg-gray-100 overflow-hidden md:rounded-[3rem] shadow-xl">
            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
              Mistura Premium da Amazônia
            </div>
          </div>

          <div className="p-4 md:p-0 md:w-1/2 space-y-8">
            <div className="flex justify-between items-start">
              <div className="max-w-[70%]">
                <span className="text-[10px] md:text-xs font-bold text-[#FF8C00] uppercase tracking-widest mb-1 block">
                  {categories.find(c => c.id === selectedProduct.category_id)?.name || 'Categoria'}
                </span>
                <h2 className="text-2xl md:text-5xl font-extrabold text-[#1a472a] uppercase tracking-tight">
                  {selectedProduct.name}
                </h2>
              </div>
              <span className="text-xl md:text-3xl font-bold text-gray-800">R$ {selectedProduct.price.toFixed(2)}</span>
            </div>

            <p className="text-gray-600 leading-relaxed text-sm md:text-lg">
              {selectedProduct.description}
            </p>

            <div className="flex items-center space-x-2 text-[#1a472a] font-medium text-sm md:text-base">
              <Zap className="w-5 h-5 fill-current" />
              <span>Foco & Energia Imediata</span>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-10">
              <div>
                <label className="text-base md:text-xl font-bold mb-4 flex items-center">
                  Escolha o Tamanho <span className="ml-2 text-xs font-normal text-gray-500 italic">(Obrigatório)</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['300ml', '500ml', '700ml'].map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`flex flex-col items-center justify-center p-3 md:p-6 border-2 rounded-xl md:rounded-2xl transition-all ${
                        selectedSize === size 
                          ? 'border-[#1a472a] bg-green-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm md:text-lg font-bold">{size}</span>
                      <span className="text-xs md:text-sm text-gray-500">
                        {size === '300ml' ? 'Pequeno' : size === '500ml' ? 'Médio' : 'Grande'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-base md:text-xl font-bold mb-4 block">
                  Turbine seu Guaraná <span className="text-xs font-normal text-gray-500">(Opcional)</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {EXTRAS.map(extra => (
                    <label 
                      key={extra.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl md:rounded-2xl cursor-pointer active:scale-[0.98] transition-all hover:border-[#1a472a]/30"
                    >
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedExtras.includes(extra.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedExtras([...selectedExtras, extra.id]);
                            else setSelectedExtras(selectedExtras.filter(id => id !== extra.id));
                          }}
                          className="w-5 h-5 text-[#1a472a] border-gray-300 rounded focus:ring-[#1a472a]"
                        />
                        <span className="ml-3 font-medium md:text-lg">{extra.name}</span>
                      </div>
                      <span className="text-sm md:text-base text-[#1a472a] font-semibold">+ R$ {extra.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-base md:text-xl font-bold mb-2">Alguma observação?</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Sem muito açúcar, extra gelado..."
                  className="w-full border-gray-200 rounded-xl md:rounded-2xl focus:ring-[#1a472a] focus:border-[#1a472a] p-3 md:p-4 md:text-lg"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:p-8 shadow-2xl z-50">
          <div className="max-w-7xl mx-auto flex items-center space-x-4 md:space-x-8">
            <div className="flex items-center border-2 border-gray-200 rounded-xl md:rounded-2xl p-1 md:p-2">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-gray-500 hover:text-[#1a472a]"
              >
                <Minus className="w-5 h-5 md:w-7 md:h-7" />
              </button>
              <span className="w-8 md:w-12 text-center font-bold md:text-2xl">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-gray-500 hover:text-[#1a472a]"
              >
                <Plus className="w-5 h-5 md:w-7 md:h-7" />
              </button>
            </div>
            <button 
              onClick={addToCart}
              className="flex-grow bg-[#1a472a] text-white font-bold py-4 md:py-6 rounded-xl md:rounded-2xl shadow-lg active:bg-green-900 transition-all md:text-2xl"
            >
              Adicionar ao Carrinho
            </button>
          </div>
        </footer>
      </div>
    );
  };

  const CartScreen = () => (
    <div className="bg-[#F9F7F2] min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-stone-200 px-4 py-4 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-[#2D5A27]">Seu Carrinho</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-12 max-w-7xl mx-auto w-full">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400">
            <ShoppingBag className="w-24 h-24 mb-6 opacity-20" />
            <p className="text-xl">Seu carrinho está vazio</p>
            <button 
              onClick={() => setCurrentScreen('home')}
              className="mt-6 bg-[#2D5A27] text-white px-8 py-3 rounded-xl font-bold hover:bg-green-800 transition-colors"
            >
              Voltar para a loja
            </button>
          </div>
        ) : (
          <div className="md:grid md:grid-cols-3 md:gap-12">
            <section className="md:col-span-2 space-y-6">
              {cart.map((item, idx) => (
                <article key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-stone-100 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-xl leading-tight">{item.name}</h3>
                        <span className="text-[#2D5A27] font-bold text-lg">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-stone-500 mt-2">
                        Tamanho: {item.selectedSize}
                        {item.selectedExtras.length > 0 && ` • Extras: ${item.selectedExtras.length}`}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center bg-stone-100 rounded-full px-3 py-1.5">
                        <button 
                          onClick={() => updateQuantity(idx, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-stone-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="mx-4 font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(idx, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-stone-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(idx)}
                        className="text-red-500 font-bold hover:text-red-600 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="md:col-span-1 mt-8 md:mt-0 space-y-6">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Cupom de Desconto" 
                  className="flex-grow border-stone-200 rounded-2xl px-4 py-4 focus:ring-[#2D5A27] focus:border-[#2D5A27]"
                />
                <button className="bg-stone-200 text-stone-700 font-bold px-6 py-4 rounded-2xl hover:bg-stone-300 transition-colors">Aplicar</button>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 space-y-4">
                <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>R$ {cartTotal.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Taxa de Entrega</span>
                  <span>R$ {cartTotal.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Imposto</span>
                  <span>R$ {cartTotal.tax.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-dashed border-stone-200 flex justify-between items-center">
                  <span className="text-xl font-bold">Total</span>
                  <span className="text-3xl font-bold text-[#2D5A27]">R$ {cartTotal.total.toFixed(2)}</span>
                </div>
                
                <button 
                  onClick={() => setCurrentScreen('checkout')}
                  className="w-full bg-[#2D5A27] text-white font-bold py-5 rounded-2xl shadow-lg flex justify-between items-center px-8 mt-6 hover:bg-green-800 transition-all active:scale-[0.98]"
                >
                  <span>Finalizar Compra</span>
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );

  const CheckoutScreen = () => (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50 px-4 py-4 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <button onClick={() => setCurrentScreen('cart')} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg md:text-2xl font-bold text-center flex-grow uppercase tracking-wider text-[#2D5A27]">Finalizar Pedido</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-12 space-y-6 max-w-7xl mx-auto w-full">
        <div className="md:grid md:grid-cols-2 md:gap-12">
          <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm md:text-base font-semibold text-gray-500 uppercase tracking-tight">Endereço de Entrega</h2>
                <button className="text-xs md:text-sm font-bold text-[#2D5A27]">Alterar</button>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-4 rounded-full flex-shrink-0">
                  <MapPin className="w-6 h-6 text-[#2D5A27]" />
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-gray-800 md:text-lg">Casa</p>
                  <p className="text-sm md:text-base text-gray-500 leading-snug mt-1">Av. Paulista, 1000 - Apartamento 42<br/>Bela Vista, São Paulo - SP</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm md:text-base font-semibold text-gray-500 uppercase tracking-tight ml-1">Método de Pagamento</h2>
              <div className="space-y-3">
                {['Cartão de Crédito', 'Pix', 'Dinheiro na Entrega'].map((method, i) => (
                  <label key={method} className="flex items-center justify-between bg-white p-5 rounded-2xl border-2 border-transparent has-[:checked]:border-[#2D5A27] cursor-pointer transition-all shadow-sm hover:border-gray-200">
                    <div className="flex items-center gap-4">
                      {i === 0 ? <CreditCard className="w-6 h-6 text-gray-600" /> : i === 1 ? <div className="w-6 h-6 flex items-center justify-center bg-teal-500 rounded text-white text-[10px] font-bold">PIX</div> : <Zap className="w-6 h-6 text-gray-600" />}
                      <span className="font-bold text-gray-700 md:text-lg">{method}</span>
                    </div>
                    <input 
                      type="radio" 
                      name="payment" 
                      defaultChecked={i === 0}
                      className="w-6 h-6 text-[#2D5A27] focus:ring-[#2D5A27]" 
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6 mt-6 md:mt-0">
            <section className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-sm md:text-base font-semibold text-gray-500 uppercase tracking-tight mb-6">Resumo do Pedido</h2>
              <div className="space-y-6">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className="w-20 h-20 bg-gray-50 border flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden">
                      <img src={item.image} alt={item.name} className="max-w-full max-h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800 md:text-lg truncate max-w-[200px]">{item.name}</span>
                        <span className="font-bold text-gray-900 md:text-lg">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold text-xs">Qtd: {item.quantity}</span>
                        <span className="text-xs text-gray-400">• {item.selectedSize}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <hr className="border-gray-100 my-6" />
                <div className="space-y-3">
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-700 font-medium">R$ {cartTotal.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-500">Taxa de Entrega</span>
                    <span className="text-green-600 font-bold">Grátis</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-3xl font-extrabold text-[#2D5A27]">R$ {cartTotal.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </section>

            <footer className="bg-white md:bg-transparent border-t md:border-none p-4 md:p-0 sticky md:static bottom-0 z-40">
              <button 
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full bg-[#2D5A27] text-white font-bold py-5 rounded-2xl text-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-green-800"
              >
                {placingOrder ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Confirmar Pedido</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">Checkout Seguro por Guaraná Delivery</p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );

  const AdminScreen = () => {
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'report' | 'profile' | 'users'>('list');
    const [orders, setOrders] = useState<Order[]>([]);
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
        cost_price: editingProduct.cost_price || 0
      };

      setSaving(true);
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
          <h2 className="text-2xl font-bold text-[#1B4D3E]">
            {isEditing ? 'Editar Produto' : 'Cadastrar Novo Produto'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Produto</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Guaraná com Açaí"
                value={editingProduct?.name || ''}
                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1B4D3E] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
              <textarea 
                required
                placeholder="Descreva os ingredientes e o sabor..."
                value={editingProduct?.description || ''}
                onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1B4D3E] outline-none"
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
                  className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1B4D3E] outline-none"
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
                  className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1B4D3E] outline-none"
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
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1B4D3E] outline-none bg-white"
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
                className="w-full border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#1B4D3E] outline-none"
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
              className="flex-1 py-4 bg-[#1B4D3E] text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg hover:bg-green-900 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {saving ? 'Salvando...' : isEditing ? 'Atualizar Produto' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      );
    };

    const SalesReport = () => {
      const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
      const averageOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

      if (loadingOrders) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#1B4D3E]" />
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
                <div className="bg-green-100 p-3 rounded-2xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Faturamento Total</p>
              </div>
              <p className="text-3xl font-black text-[#1B4D3E]">R$ {totalRevenue.toFixed(2)}</p>
              <div className="flex items-center gap-1 mt-2 text-green-600 text-sm font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>+12% este mês</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-orange-100 p-3 rounded-2xl">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total de Pedidos</p>
              </div>
              <p className="text-3xl font-black text-[#1B4D3E]">{orders.length}</p>
              <p className="text-gray-400 text-sm mt-2 font-medium">Pedidos realizados</p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ticket Médio</p>
              </div>
              <p className="text-3xl font-black text-[#1B4D3E]">R$ {averageOrder.toFixed(2)}</p>
              <p className="text-gray-400 text-sm mt-2 font-medium">Por pedido</p>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-6 border-b border-stone-50 flex justify-between items-center bg-[#1B4D3E]/5">
              <h3 className="font-bold text-xl text-[#1B4D3E]">Gestão de Vendas</h3>
              <button onClick={fetchOrders} className="text-[#FF8C00] font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all">Atualizar Dados</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                    <th className="px-6 py-4">ID do Pedido</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Pagamento</th>
                    <th className="px-6 py-4 text-right">Total</th>
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
                      className="hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#1B4D3E]">
                        R$ {order.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                        Nenhum pedido encontrado.
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
                <div className="bg-[#1B4D3E] p-6 text-white flex justify-between items-center">
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
                      <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#1B4D3E]" />
                      <p className="text-sm font-bold">Carregando itens...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl">
                          <div>
                            <p className="font-bold text-[#1B4D3E]">{item.product_name}</p>
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
                      <span className="text-2xl font-black text-[#FF8C00]">R$ {selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-stone-50">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="w-full py-4 bg-[#1B4D3E] text-white rounded-2xl font-bold shadow-lg"
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
      <div className="bg-[#F9F7F2] min-h-screen pb-24">
        <header className="bg-[#1B4D3E] p-6 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between mb-6">
            <button onClick={() => setCurrentScreen('home')} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Painel Administrativo</h1>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-red-300"
              title="Sair"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
          
          <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => {
                setActiveTab('list');
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className={`flex-1 min-w-[120px] py-3 rounded-2xl font-bold transition-all ${activeTab === 'list' ? 'bg-[#FF8C00] text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              Produtos
            </button>
            <button 
              onClick={() => {
                setActiveTab('create');
                setEditingProduct({ name: '', description: '', price: 0, cost_price: 0, image: '', category_id: categories[0]?.id || '' });
                setIsModalOpen(false);
              }}
              className={`flex-1 min-w-[120px] py-3 rounded-2xl font-bold transition-all ${activeTab === 'create' ? 'bg-[#FF8C00] text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              Cadastrar Novo
            </button>
            <button 
              onClick={() => {
                setActiveTab('report');
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className={`flex-1 min-w-[120px] py-3 rounded-2xl font-bold transition-all ${activeTab === 'report' ? 'bg-[#FF8C00] text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              Vendas
            </button>
            <button 
              onClick={() => {
                setActiveTab('users');
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className={`flex-1 min-w-[120px] py-3 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-[#FF8C00] text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              Usuários
            </button>
            <button 
              onClick={() => {
                setActiveTab('profile');
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className={`flex-1 min-w-[120px] py-3 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-[#FF8C00] text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              Perfil
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-6">
          {activeTab === 'list' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#5D4037]">Lista de Produtos ({products.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-50">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-bold text-gray-800 leading-tight">{product.name}</h3>
                      <p className="text-[#FF8C00] font-bold">R$ {product.price.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1">
                        {categories.find(c => c.id === product.category_id)?.name}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-[#1B4D3E] hover:bg-green-50 rounded-xl transition-colors font-bold text-sm"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
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
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#5D4037] mb-4">Usuários Registrados ({allUsers.length})</h2>
              {loadingUsersList ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-10 h-10 animate-spin text-[#1B4D3E]" />
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {allUsers.map(u => (
                        <tr key={u.id}>
                          <td className="px-6 py-4 font-bold text-[#1B4D3E]">{u.email}</td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-400">{u.id}</td>
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
                <div className="w-24 h-24 bg-[#FF8C00] rounded-full mx-auto mb-6 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-2xl font-bold text-[#1B4D3E]">{user?.email}</h3>
                <p className="text-gray-400 text-sm mt-1">Membro registrado</p>
                <div className="mt-8 space-y-4">
                  <button 
                    onClick={async () => {
                      if (user?.email) {
                        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                          redirectTo: window.location.origin
                        });
                        if (error) alert(error.message);
                        else alert('Link de redefinição enviado para seu e-mail!');
                      }
                    }}
                    className="w-full py-4 px-6 border-2 border-[#1B4D3E] text-[#1B4D3E] rounded-2xl font-bold hover:bg-[#1B4D3E] hover:text-white transition-all"
                  >
                    Redefinir Minha Senha
                  </button>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="w-full py-4 px-6 bg-red-500 text-white rounded-2xl font-bold shadow-lg hover:bg-red-600 transition-all"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>
            </div>
          )}
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
    <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md mx-auto">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 md:w-32 md:h-32 bg-green-100 rounded-full flex items-center justify-center mb-8 mx-auto"
        >
          <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-[#2D5A27]" />
        </motion.div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#1B4D3E] mb-4">Pedido Realizado!</h1>
        <p className="text-gray-500 md:text-xl mb-12">Seu delicioso Guaraná está a caminho da sua casa.</p>
        <div className="space-y-4">
          <button 
            onClick={() => {
              setCart([]);
              setCurrentScreen('history');
            }}
            className="bg-[#1B4D3E] text-white font-bold px-8 py-4 md:py-6 rounded-2xl shadow-lg w-full md:text-xl hover:bg-green-900 transition-colors"
          >
            Acompanhar Pedido
          </button>
          <button 
            onClick={() => {
              setCart([]);
              setCurrentScreen('home');
            }}
            className="text-gray-500 font-bold px-8 py-4 w-full"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    </div>
  );

  const MyOrdersScreen = () => {
    const [userOrders, setUserOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
      async function fetchMyOrders() {
        if (!user) return;
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          setUserOrders(data || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingOrders(false);
        }
      }
      fetchMyOrders();
    }, []);

    const toggleOrder = async (orderId: string) => {
      if (expandedOrderId === orderId) {
        setExpandedOrderId(null);
        return;
      }
      setExpandedOrderId(orderId);
      
      if (!orderItemsMap[orderId]) {
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
      <div className="bg-[#F5F5DC] min-h-screen pb-24">
        <header className="bg-[#1B4D3E] p-8 text-white rounded-b-[3rem]">
          <h1 className="text-2xl font-bold">Meus Pedidos</h1>
          <p className="text-white/70">Acompanhe suas delícias</p>
        </header>

        <main className="p-6 space-y-4 max-w-2xl mx-auto">
          {loadingOrders ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-[#1B4D3E]" />
            </div>
          ) : userOrders.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="bg-white/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 font-bold">Você ainda não fez nenhum pedido.</p>
              <button 
                onClick={() => setCurrentScreen('home')}
                className="text-[#FF8C00] font-bold"
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
                        <p className="font-bold text-[#1B4D3E]">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                          order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                          order.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.status === 'pending' ? 'Pendente' : 
                           order.status === 'delivered' ? 'Entregue' : order.status}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">{order.payment_method}</p>
                      <p className="font-black text-[#FF8C00] text-lg">R$ {order.total.toFixed(2)}</p>
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
                              <Loader2 className="w-6 h-6 animate-spin text-[#1B4D3E]" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start animate-in fade-in slide-in-from-top-1 duration-200" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-[#1B4D3E]">{item.product_name}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">
                                      {item.quantity}x {item.selected_size}
                                      {item.selected_extras && item.selected_extras.length > 0 && ` • +${item.selected_extras.length} extras`}
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-[#1B4D3E] ml-4">
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
                               <span className="text-[#1B4D3E] font-bold text-[11px] text-right max-w-[180px] leading-tight">
                                 {order.delivery_address.address}
                               </span>
                             </div>
                             <div className="flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                 <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pagamento</span>
                               </div>
                               <span className="text-[#1B4D3E] font-bold text-[11px]">
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

        {/* Global Nav integration */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between items-center z-50 rounded-t-3xl shadow-2xl max-w-2xl mx-auto md:mb-6 md:rounded-full md:border md:shadow-lg">
          <button 
            onClick={() => setCurrentScreen('home')}
            className={`flex flex-col items-center gap-1 ${currentScreen === 'home' ? 'text-[#FF8C00]' : 'text-gray-400'}`}
          >
            <HomeIcon className={`w-6 h-6 ${currentScreen === 'home' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-bold">Fazer Pedidos</span>
          </button>
          <button 
            onClick={() => setCurrentScreen('history')}
            className={`flex flex-col items-center gap-1 ${currentScreen === 'history' ? 'text-[#FF8C00]' : 'text-gray-400'}`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-[10px] font-bold">Meus Pedidos</span>
          </button>
          <button onClick={() => setCurrentScreen('cart')} className={`flex flex-col items-center gap-1 ${currentScreen === 'cart' ? 'text-[#FF8C00]' : 'text-gray-400'} relative`}>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF8C00] text-white text-[8px] flex items-center justify-center rounded-full border border-white">
                {cart.length}
              </span>
            )}
            <ShoppingBag className="w-6 h-6" />
            <span className="text-[10px] font-bold">Carrinho</span>
          </button>
          <button onClick={() => setCurrentScreen('admin')} className={`flex flex-col items-center gap-1 ${currentScreen === 'admin' ? 'text-[#FF8C00]' : 'text-gray-400'}`}>
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        </nav>
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
        setAuthLoading(true);
        setError(null);
        setMessage(null);
        
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
          setError(err.message || 'Erro na autenticação');
        } finally {
          setAuthLoading(false);
        }
      };

      return (
        <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden"
          >
            <div className="bg-[#1B4D3E] p-12 text-center text-white">
              <div className="w-20 h-20 bg-[#FF8C00] rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg rotate-12">
                <Zap className="w-10 h-10 text-white fill-current" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Guaraná Delivery</h1>
              <p className="text-white/70 text-sm mt-2">A energia da Amazônia na sua porta</p>
            </div>
            
            <form onSubmit={handleAuth} className="p-10 space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-stone-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] outline-none"
                  />
                </div>
                {!isForgotPassword && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="password" 
                      required
                      placeholder="Sua senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-stone-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] outline-none"
                    />
                  </div>
                )}
              </div>

              {!isSignUp && !isForgotPassword && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs font-bold text-[#1B4D3E] hover:text-[#FF8C00] transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold text-center">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-sm font-bold text-center">
                  {message}
                </div>
              )}

              <button 
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#1B4D3E] text-white font-bold py-5 rounded-2xl shadow-lg hover:bg-green-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
                {isForgotPassword ? 'Enviar Link' : isSignUp ? 'Criar Conta' : 'Entrar Agora'}
              </button>

              <div className="text-center space-y-4">
                {isForgotPassword ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-gray-500 text-sm font-bold hover:text-[#FF8C00] transition-colors"
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
                    className="text-gray-500 text-sm font-bold hover:text-[#FF8C00] transition-colors"
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
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1B4D3E]" />
      </div>
    );
  }

  if (isResettingPassword) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 space-y-6"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#1B4D3E]">Nova Senha</h2>
            <p className="text-gray-500 text-sm mt-2">Digite sua nova senha abaixo</p>
          </div>
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const newPassword = (e.currentTarget.elements.namedItem('new-password') as HTMLInputElement).value;
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
            <input 
              name="new-password"
              type="password" 
              required
              placeholder="Nova Senha"
              className="w-full bg-stone-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF8C00] outline-none"
            />
            <button 
              type="submit"
              className="w-full bg-[#1B4D3E] text-white font-bold py-5 rounded-2xl shadow-lg hover:bg-green-900 transition-all"
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

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          {currentScreen === 'home' && <HomeScreen />}
          {currentScreen === 'product' && <ProductDetailScreen />}
          {currentScreen === 'cart' && <CartScreen />}
          {currentScreen === 'checkout' && <CheckoutScreen />}
          {currentScreen === 'success' && <SuccessScreen />}
          {currentScreen === 'admin' && <AdminScreen />}
          {currentScreen === 'history' && <MyOrdersScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
