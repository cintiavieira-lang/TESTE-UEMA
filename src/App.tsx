/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  ChevronLeft, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Home as HomeIcon, 
  User, 
  ArrowRight,
  CreditCard,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, Category, Extra } from './types';
import { PRODUCTS, CATEGORIES, EXTRAS, ADDONS } from './constants';

type Screen = 'home' | 'product' | 'cart' | 'checkout' | 'success';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSize, setSelectedSize] = useState('300ml');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

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
    // Reset selection
    setQuantity(1);
    setSelectedExtras([]);
    setNotes('');
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
      <header className="bg-[#1B4D3E] p-6 rounded-b-[2rem] shadow-lg text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-white/70 text-sm">Delivery to</p>
            <h1 className="font-bold text-lg flex items-center gap-1">
              <MapPin className="w-4 h-4 text-[#FF8C00]" />
              Home, Downtown
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#FF8C00] border-2 border-white overflow-hidden">
            <img src="https://picsum.photos/seed/user/100/100" alt="User" referrerPolicy="no-referrer" />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search for your favorite Guaraná..." 
            className="w-full bg-white text-gray-800 pl-10 pr-4 py-3 rounded-2xl border-none focus:ring-2 focus:ring-[#FF8C00]"
          />
        </div>
      </header>

      <main className="mt-8 px-6 space-y-8">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-xl text-[#5D4037]">Categories</h2>
            <button className="text-[#FF8C00] text-sm font-semibold">See All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center border-2 border-transparent hover:border-[#2D8B57]/20 transition-all cursor-pointer">
                  <span className="text-2xl">{cat.icon}</span>
                </div>
                <span className="text-xs font-bold text-[#5D4037]">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-xl text-[#5D4037]">Featured Blends</h2>
            <span className="bg-[#FF8C00] text-white text-[10px] px-2 py-1 rounded-full uppercase font-bold">New Summer</span>
          </div>
          <div className="space-y-6">
            {PRODUCTS.filter(p => p.tags?.includes('New Summer') || p.id === '2').map(product => (
              <motion.div 
                key={product.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => openProduct(product)}
                className="bg-white rounded-[2.5rem] p-4 shadow-md flex items-center overflow-hidden border border-gray-100 cursor-pointer"
              >
                <div className="w-1/2 pr-4">
                  <h3 className="font-bold text-[#1B4D3E] text-lg leading-tight mb-1">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#FF8C00] text-lg">${product.price.toFixed(2)}</span>
                    <button className="bg-[#1B4D3E] text-white rounded-full p-2">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="w-1/2 h-32">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-xl text-[#5D4037] mb-4">Popular Add-ons</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {ADDONS.map((addon, i) => (
              <div key={i} className="min-w-[140px] bg-white p-3 rounded-3xl shadow-sm text-center">
                <img src={addon.image} alt={addon.name} className="w-16 h-16 mx-auto mb-2 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <p className="text-sm font-bold text-[#5D4037]">{addon.name}</p>
                <p className="text-[#FF8C00] font-bold text-xs">+${addon.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center z-50 rounded-t-3xl shadow-2xl">
        <button className="flex flex-col items-center gap-1 text-[#FF8C00]">
          <HomeIcon className="w-6 h-6 fill-current" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-bold">Search</span>
        </button>
        <button onClick={() => setCurrentScreen('cart')} className="flex flex-col items-center gap-1 text-gray-400 relative">
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF8C00] text-white text-[8px] flex items-center justify-center rounded-full border border-white">
              {cart.length}
            </span>
          )}
          <ShoppingBag className="w-6 h-6" />
          <span className="text-[10px] font-bold">Orders</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>
    </div>
  );

  const ProductDetailScreen = () => {
    if (!selectedProduct) return null;
    return (
      <div className="bg-white min-h-screen pb-32">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
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
        </header>

        <main>
          <div className="relative w-full h-80 bg-gray-100 overflow-hidden">
            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
              Premium Amazon Blend
            </div>
          </div>

          <div className="p-4 space-y-6">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-extrabold text-[#1a472a] uppercase tracking-tight max-w-[70%]">
                {selectedProduct.name}
              </h2>
              <span className="text-xl font-bold text-gray-800">R$ {selectedProduct.price.toFixed(2)}</span>
            </div>

            <p className="text-gray-600 leading-relaxed text-sm">
              {selectedProduct.description}
            </p>

            <div className="flex items-center space-x-2 text-[#1a472a] font-medium text-sm">
              <Zap className="w-5 h-5 fill-current" />
              <span>Foco & Energia Imediata</span>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-8">
              <div>
                <label className="text-base font-bold mb-4 flex items-center">
                  Escolha o Tamanho <span className="ml-2 text-xs font-normal text-gray-500 italic">(Obrigatório)</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['300ml', '500ml', '700ml'].map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all ${
                        selectedSize === size 
                          ? 'border-[#1a472a] bg-green-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-bold">{size}</span>
                      <span className="text-xs text-gray-500">
                        {size === '300ml' ? 'Pequeno' : size === '500ml' ? 'Médio' : 'Grande'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-base font-bold mb-4 block">
                  Turbine seu Guaraná <span className="text-xs font-normal text-gray-500">(Opcional)</span>
                </label>
                <div className="space-y-3">
                  {EXTRAS.map(extra => (
                    <label 
                      key={extra.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl cursor-pointer active:scale-[0.98] transition-all"
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
                        <span className="ml-3 font-medium">{extra.name}</span>
                      </div>
                      <span className="text-sm text-[#1a472a] font-semibold">+ R$ {extra.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-base font-bold mb-2">Alguma observação?</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Sem muito açúcar, extra gelado..."
                  className="w-full border-gray-200 rounded-xl focus:ring-[#1a472a] focus:border-[#1a472a] p-3"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
          <div className="max-w-md mx-auto flex items-center space-x-4">
            <div className="flex items-center border-2 border-gray-200 rounded-xl p-1">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#1a472a]"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#1a472a]"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={addToCart}
              className="flex-grow bg-[#1a472a] text-white font-bold py-4 rounded-xl shadow-lg active:bg-green-900 transition-all"
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
        <button onClick={() => setCurrentScreen('home')} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-[#2D5A27]">Your Cart</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-grow p-4 space-y-6">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
            <p>Seu carrinho está vazio</p>
            <button 
              onClick={() => setCurrentScreen('home')}
              className="mt-4 text-[#2D5A27] font-bold"
            >
              Voltar para a loja
            </button>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              {cart.map((item, idx) => (
                <article key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex gap-4">
                  <div className="w-20 h-20 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                        <span className="text-[#2D5A27] font-bold">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Size: {item.selectedSize}
                        {item.selectedExtras.length > 0 && ` • Extras: ${item.selectedExtras.length}`}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center bg-stone-100 rounded-full px-2 py-1">
                        <button 
                          onClick={() => updateQuantity(idx, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="mx-3 font-semibold text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(idx, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(idx)}
                        className="text-red-500 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="flex gap-2">
              <input 
                type="text" 
                placeholder="Promo Code" 
                className="flex-grow border-stone-200 rounded-xl px-4 py-3 focus:ring-[#2D5A27] focus:border-[#2D5A27]"
              />
              <button className="bg-stone-200 text-stone-700 font-bold px-6 py-3 rounded-xl">Apply</button>
            </section>

            <section className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 space-y-3">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>${cartTotal.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery Fee</span>
                <span>${cartTotal.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Tax</span>
                <span>${cartTotal.tax.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-dashed border-stone-200 flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-[#2D5A27]">${cartTotal.total.toFixed(2)}</span>
              </div>
            </section>
          </>
        )}
      </main>

      {cart.length > 0 && (
        <footer className="p-4 bg-white border-t border-stone-100 sticky bottom-0">
          <button 
            onClick={() => setCurrentScreen('checkout')}
            className="w-full bg-[#2D5A27] text-white font-bold py-4 rounded-2xl shadow-lg flex justify-between items-center px-6 active:scale-[0.98] transition-all"
          >
            <span>Proceed to Checkout</span>
            <div className="flex items-center gap-2">
              <span className="opacity-80 font-normal">|</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        </footer>
      )}
    </div>
  );

  const CheckoutScreen = () => (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50 px-4 py-4 flex items-center justify-between">
        <button onClick={() => setCurrentScreen('cart')} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-center flex-grow uppercase tracking-wider text-[#2D5A27]">Checkout</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-grow p-4 space-y-6 max-w-md mx-auto w-full">
        <section className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-tight">Delivery Address</h2>
            <button className="text-xs font-bold text-[#2D5A27]">Change</button>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
              <MapPin className="w-6 h-6 text-[#2D5A27]" />
            </div>
            <div className="flex-grow">
              <p className="font-bold text-gray-800">Home</p>
              <p className="text-sm text-gray-500 leading-snug mt-0.5">Av. Paulista, 1000 - Apartment 42<br/>Bela Vista, São Paulo - SP</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-tight ml-1">Payment Method</h2>
          <div className="space-y-2">
            {['Credit Card', 'Pix', 'Cash on Delivery'].map((method, i) => (
              <label key={method} className="flex items-center justify-between bg-white p-4 rounded-xl border-2 border-transparent has-[:checked]:border-[#2D5A27] cursor-pointer transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  {i === 0 ? <CreditCard className="w-6 h-6 text-gray-600" /> : i === 1 ? <div className="w-6 h-6 flex items-center justify-center bg-teal-500 rounded text-white text-[10px] font-bold">PIX</div> : <Zap className="w-6 h-6 text-gray-600" />}
                  <span className="font-medium text-gray-700">{method}</span>
                </div>
                <input 
                  type="radio" 
                  name="payment" 
                  defaultChecked={i === 0}
                  className="w-5 h-5 text-[#2D5A27] focus:ring-[#2D5A27]" 
                />
              </label>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-tight mb-4">Order Summary</h2>
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-gray-50 border flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden">
                  <img src={item.image} alt={item.name} className="max-w-full max-h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{item.name}</span>
                    <span className="text-sm font-bold text-gray-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold text-xs">Qty: {item.quantity}</span>
                </div>
              </div>
            ))}
            <hr className="border-gray-100 my-4" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700">R$ {cartTotal.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery Fee</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-xl font-extrabold text-[#2D5A27]">R$ {cartTotal.subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t p-4 pb-8 sticky bottom-0 shadow-2xl">
        <button 
          onClick={() => setCurrentScreen('success')}
          className="w-full bg-[#2D5A27] text-white font-bold py-4 rounded-xl text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>Place Order</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-3 uppercase tracking-widest font-medium">Secure Checkout Powered by Guaraná Delivery</p>
      </footer>
    </div>
  );

  const SuccessScreen = () => (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-12 h-12 text-[#2D5A27]" />
      </motion.div>
      <h1 className="text-3xl font-extrabold text-[#1B4D3E] mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-8">Your delicious Guaraná is on its way to your home.</p>
      <button 
        onClick={() => {
          setCart([]);
          setCurrentScreen('home');
        }}
        className="bg-[#1B4D3E] text-white font-bold px-8 py-4 rounded-2xl shadow-lg w-full max-w-xs"
      >
        Back to Home
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto shadow-2xl min-h-screen relative overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentScreen === 'home' && <HomeScreen />}
          {currentScreen === 'product' && <ProductDetailScreen />}
          {currentScreen === 'cart' && <CartScreen />}
          {currentScreen === 'checkout' && <CheckoutScreen />}
          {currentScreen === 'success' && <SuccessScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
