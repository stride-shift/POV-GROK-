import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Building2 } from 'lucide-react';
import { apiService } from '../../services/api';

const StockBanner = ({ companyName, className = "" }) => {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (companyName) {
      fetchStockData(companyName);
    }
  }, [companyName]);

  const fetchStockData = async (company) => {
    setLoading(true);
    setError(false);
    
    try {
      const response = await apiService.getCompanyFinancialData(company);
      
      if (response.is_public && response.financial_data) {
        setStockData(response.financial_data);
      } else {
        setStockData(null);
        setError(false); // Not an error, just private company
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(true);
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if no company name or if it's loading and we don't have data yet
  if (!companyName || (loading && !stockData)) {
    return null;
  }

  // Don't render if it's a private company or error
  if (!stockData && !loading) {
    return null;
  }

  return (
    <div className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ) : stockData ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Company and Ticker */}
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">{companyName}</div>
                  <div className="text-sm text-gray-500">Public Company</div>
                </div>
              </div>

              {/* Stock Price */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-gray-900">
                    {stockData.ticker}
                  </span>
                  <span className="font-bold text-xl text-gray-900">
                    ${stockData.current_price}
                  </span>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                    stockData.price_change >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {stockData.price_change >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {stockData.price_change >= 0 ? '+' : ''}{stockData.price_change_percent}%
                  </div>
                </div>

                {/* Market Cap */}
                {stockData.market_cap_formatted && (
                  <div className="text-sm">
                    <span className="text-gray-500">Market Cap:</span>{' '}
                    <span className="font-semibold text-gray-900">{stockData.market_cap_formatted}</span>
                  </div>
                )}

                {/* Volume */}
                {stockData.volume && (
                  <div className="text-sm">
                    <span className="text-gray-500">Volume:</span>{' '}
                    <span className="font-semibold text-gray-900">{stockData.volume}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {stockData.sector && (
                <span>{stockData.sector}</span>
              )}
              {stockData.exchange && (
                <span>{stockData.exchange}</span>
              )}
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>Live</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StockBanner;
