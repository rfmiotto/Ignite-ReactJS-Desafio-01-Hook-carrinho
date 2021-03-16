import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyOnCart = cart.find(product => product.id === productId);

      if (productAlreadyOnCart) {
        const { amount } = productAlreadyOnCart;
        
        updateProductAmount({ productId, amount: amount + 1 });

        return;
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`)

      if (stock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const { data: product } = await api.get<Product>(`products/${productId}`)

      const updatedCart = [...cart, { ...product, amount: 1 }];

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductOnCart = cart.find(product => product.id === productId);

      if (isProductOnCart) {
        const filteredProducts = cart.filter(product => product.id !== productId);
        
        setCart(filteredProducts);

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(filteredProducts)
        );
      } else {
        toast.error('Erro na remoção do produto')
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productAlreadyOnCart = cart.find(product => product.id === productId);

      if (!productAlreadyOnCart) {
        throw new Error();
      }

      const { data: stock } = await api.get<Stock>(`stock/${productId}`)

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (amount < 1) return;

      const updatedProducts = cart.map(product => (
        product.id === productId
          ? { ...product, amount }
          : product
      ))

      setCart(updatedProducts);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProducts));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
