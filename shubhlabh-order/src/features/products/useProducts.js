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
      } else {
        setProducts(data || []);
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
