import { useState, useEffect } from 'react';
import { supabase } from '../../core/api/supabase';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        setError(error);
        setProducts([]);
        console.log('USE_PRODUCTS ERROR:', error);
      } else {
        setProducts(data || []);
        console.log('USE_PRODUCTS FETCHED:', (data || []).length, 'records.');
        if (data && data.length > 0) {
           const categories = [...new Set(data.map(p => p.category))];
           console.log('USE_PRODUCTS CATEGORIES:', categories.join(', '));
           const makka = data.filter(p => p.name === 'Makka Daliya');
           console.log('USE_PRODUCTS MAKKA DALIYA COUNT:', makka.length);
        }
      }
    } catch (e) {
      setError(e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, refetch: fetchProducts };
}
