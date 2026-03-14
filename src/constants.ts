import { Product, Category, Extra } from './types';

export const CATEGORIES: Category[] = [
  { id: 'traditional', name: 'Tradicional', icon: '🥤' },
  { id: 'acai', name: 'Açaí', icon: '🍇' },
  { id: 'cupuacu', name: 'Cupuaçu', icon: '🥥' },
  { id: 'farinha', name: 'Farinha Láctea', icon: '🥣' },
  { id: 'chocolate', name: 'Chocolate', icon: '🍫' },
];

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Açaí Power Blend',
    description: 'Creamy açaí, guaraná syrup, and granola',
    price: 14.50,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBD3k692D5YxyD-SYSh14yHGr-EQcjU6JzSiGuQay7GxhY6IqxRL87RhBOWmBfnEousB82Kl90EvK5qiOEa7Td3Z8w2sxqShczz-CkgWPXJFK8KDjihPja2MRoVpQGhkIiS7ntWPdkddtU1mjPR8SflhJDDQmDoQWAvun6QvRl6VUXZDMT3kRsKC_8ITEL5NYha3xZDJkskPSlZR57WzX8ZyXfEASihLkpTF9TeVYAxYO5ZV6LbsTgLJYzMs4-ycaGcSUALBWg1KLo6',
    category: 'acai',
    tags: ['New Summer']
  },
  {
    id: '2',
    name: 'Cupuaçu Frost',
    description: 'Exotic cupuaçu pulp mixed with icy guaraná',
    price: 13.00,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARu177Ivu1verw4SmXj9R0RByHgCi7NH0YEUQfY_Ccizn01prYoOeYyd-0kBv1CEOhG0ZCHRRLW5fw3hHnsoVIZrejhU12GANvApS3r-ERppfg-TYFFn0l80vADGdPJtV79IPQ9w1PBYvq9UZKFtYuxMGv2ib-7HwaGmuwF35Wh3wQP0CdHKapbN_b1qMO3qthYL33d6wbdqZm2jucU9NnFCJf-4Enmr99GP3fkcfPVFTODvv0zk4BEQHTtCEA4ek7Nx5PSfrRtm9e',
    category: 'cupuacu'
  },
  {
    id: '3',
    name: 'Guaraná Tradicional com Amendoim',
    description: 'Experimente a verdadeira força da Amazônia! Nosso Guaraná Tradicional é batido com xarope natural e amendoim selecionado, criando uma textura cremosa e um sabor inigualável.',
    price: 18.90,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoaf8EX31SGkK14t12cRNu1BTbEmZcEtdGq2hMuHRw_yv9W6wOjSzEx7PeINNZ_7J3F88cntYtkgIgPabuRdisKmlnqqpo18m9zLou52H_FgNg6HmlBMYhiLgFEsFEyQiJ0JwvMHxvEb6tZo_o7bjfVTkzlOriG2w5zdf5nfXxXxPZh64S5ByNNwjGMKh9-K-JD7QU0TvT5fVUBaobepbHG5mPoFW6jPyrECfzx8ZlBYY_u9N8tqkn_aOUqJd1yzXVShyxWc9RzdU9',
    category: 'traditional'
  },
  {
    id: '4',
    name: 'Guaraná com Cupuaçu Cremoso',
    description: 'O sabor exótico da Amazônia em sua melhor forma! Nosso tradicional guaraná batido com polpa fresca de cupuaçu, resultando em uma bebida super cremosa.',
    price: 21.90,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtc4ry44CXUVgCA02j53rHontqg9CkBwrPti2nRqOAe71R52X1l9ejlLa7Kuk2DHPESsBBMxPwiF32GBK-fLgxoQ7V45-xS46YfALzTOfvooPBPxInKSmKh24V-OLUE3zV5FICxrit1IdlbvVt4wIW3cKYF5AOeJ0owXSKtWqkYaaZoHkJSIWermyok0de_7XQ-2xoaRXuvR9jET9ubK5UTUduQHg1oKLiyW8iN1XnoXDr7awMBm4jstDyDUmD1oahrK2BfQ59nZME',
    category: 'cupuacu'
  }
];

export const EXTRAS: Extra[] = [
  { id: 'leite-po', name: 'Leite em Pó', price: 2.50 },
  { id: 'granola', name: 'Granola Crocante', price: 2.00 },
  { id: 'amendoim', name: 'Amendoim Extra', price: 1.50 },
  { id: 'mel', name: 'Mel Silvestre', price: 3.00 },
  { id: 'chocolate', name: 'Calda de Chocolate', price: 2.00 },
];

export const ADDONS = [
  { name: 'Extra Cashews', price: 2.00, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFf2Kbqp4d5OwnbYmmtP9GhxfVxy12DAZ7cM3ER_CJsmSuOMiIhgAIu8pGMDF7Q9eCWD2LdX5-q3uZtUgnMCsjPa1gC_pVfAb-1hLHCxLa3Jki7j61ss9jyVd6MTumGBgyx7iAQ9nbRqSlGOs64bfyQIPe-Alz17jjVrUiQbYpRPM3abvbTy9dj5AtteTLPhBbfqPXirgds3d3ZkAk8nplednOxU3hT1gH-F7oSD9p6s6Xm7rZa362a4y-DWUQ6dB-_fzEUhVrx-tY' },
  { name: 'Milk Powder', price: 1.50, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwemma8R5eYGLdGCFc5VhqoeZV8geFAlEY5dpl0O_BgVSMHrXRVpJm1bmHcLqSEhewQMZFI1984J8Pnn_PJFE7GsZT5En3pc8ul2-JCJSTwqp8-uXM2bmvwIXbXXVNmbsckvRyYO-C-yFuRALXCVvV-W3hFhBlKy6aEyOdWb5N_oKJejV4bkcLN6mkV91AipAWBLfnfLBfWaT6SRXCu3RtoBsxJghGNSEC4idjlE4GW2b4DUEMORQ-tWiE5a9gF5mTf473_rxsloCV' },
  { name: 'Honey Granola', price: 1.00, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQwAdWNV3bRZLnn_-XKe99Vh0SIhEvcbZMtLIBEC5bfv5u81cHvdAcIOOvBwcuwXaD0N3-2_bdAAb3BVI55BK8og1NoFiFXSNX6bObwoDEMkkhMM2bbUVkmEg8RSLG24_9AZi-YxOhoGW7b-zNES9VaNOOynTsUkOgpQ5HWpxTYnX0gxliirbq6c6lJm0UZlfunHm964pc0bx1lxwFCSdK4nx_BuJSkGfmX3KVrfRzIoVnwbu1hyOGprfMrGHp9Jz4mb4gDdKxrIsP' },
];
