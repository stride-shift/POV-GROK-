"""
Financial data service for fetching stock information using Yahoo Finance
"""

import yfinance as yf
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Common ticker mappings for major companies
TICKER_MAPPINGS = {
    # Tech giants
    "apple": "AAPL",
    "apple inc": "AAPL",
    "microsoft": "MSFT",
    "microsoft corporation": "MSFT",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "amazon": "AMZN",
    "amazon.com": "AMZN",
    "meta": "META",
    "facebook": "META",
    "tesla": "TSLA",
    "tesla inc": "TSLA",
    "netflix": "NFLX",
    "nvidia": "NVDA",
    "intel": "INTC",
    "oracle": "ORCL",
    "salesforce": "CRM",
    "adobe": "ADBE",
    "cisco": "CSCO",
    "ibm": "IBM",
    "zoom": "ZM",
    "slack": "CRM",  # Now part of Salesforce
    "dropbox": "DBX",
    "spotify": "SPOT",
    "uber": "UBER",
    "lyft": "LYFT",
    "airbnb": "ABNB",
    "shopify": "SHOP",
    "square": "SQ",
    "block": "SQ",  # Square renamed to Block
    "paypal": "PYPL",
    "stripe": None,  # Private company
    
    # Financial
    "jpmorgan": "JPM",
    "jp morgan": "JPM",
    "goldman sachs": "GS",
    "morgan stanley": "MS",
    "bank of america": "BAC",
    "wells fargo": "WFC",
    "citigroup": "C",
    "american express": "AXP",
    "visa": "V",
    "mastercard": "MA",
    
    # Healthcare
    "johnson & johnson": "JNJ",
    "pfizer": "PFE",
    "moderna": "MRNA",
    "abbott": "ABT",
    "merck": "MRK",
    
    # Consumer
    "coca cola": "KO",
    "pepsi": "PEP",
    "walmart": "WMT",
    "target": "TGT",
    "home depot": "HD",
    "mcdonalds": "MCD",
    "starbucks": "SBUX",
    "nike": "NKE",
    "disney": "DIS",
    
    # Industrial
    "boeing": "BA",
    "caterpillar": "CAT",
    "general electric": "GE",
    "ford": "F",
    "general motors": "GM",
    
    # Energy
    "exxon": "XOM",
    "chevron": "CVX",
    "conocophillips": "COP",
}

def extract_ticker_symbol(company_name: str) -> Optional[str]:
    """
    Extract ticker symbol from company name using fuzzy matching
    
    Args:
        company_name: The company name to match
        
    Returns:
        Ticker symbol if found, None otherwise
    """
    if not company_name:
        return None
    
    # Normalize company name
    normalized_name = company_name.lower().strip()
    
    # Remove common suffixes
    suffixes_to_remove = [
        " inc", " inc.", " corp", " corp.", " corporation",
        " ltd", " ltd.", " limited", " llc", " llp",
        " company", " co", " co.", " group", " holdings",
        " technologies", " tech", " systems", " solutions"
    ]
    
    for suffix in suffixes_to_remove:
        if normalized_name.endswith(suffix):
            normalized_name = normalized_name[:-len(suffix)].strip()
    
    # Direct match
    if normalized_name in TICKER_MAPPINGS:
        return TICKER_MAPPINGS[normalized_name]
    
    # Partial match - check if any key is contained in the company name
    for key, ticker in TICKER_MAPPINGS.items():
        if key in normalized_name or normalized_name in key:
            return ticker
    
    return None

async def get_stock_data(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Fetch stock data for a given ticker symbol
    
    Args:
        ticker: Stock ticker symbol (e.g., 'AAPL')
        
    Returns:
        Dictionary containing stock data or None if not found
    """
    try:
        # Create ticker object
        stock = yf.Ticker(ticker)
        
        # Get current info and recent history
        info = stock.info
        history = stock.history(period="5d")  # Get last 5 days
        
        if history.empty:
            logger.warning(f"No history data found for ticker {ticker}")
            return None
        
        # Get latest trading day data
        latest_data = history.iloc[-1]
        current_price = latest_data['Close']
        
        # Calculate price change if we have enough data
        price_change = 0
        price_change_percent = 0
        
        if len(history) >= 2:
            previous_close = history.iloc[-2]['Close']
            price_change = current_price - previous_close
            price_change_percent = (price_change / previous_close) * 100
        
        # Format market cap
        market_cap = info.get('marketCap')
        market_cap_formatted = format_market_cap(market_cap) if market_cap else None
        
        # Extract key financial metrics
        financial_data = {
            "ticker": ticker.upper(),
            "company_name": info.get('longName', info.get('shortName', '')),
            "current_price": round(float(current_price), 2),
            "price_change": round(float(price_change), 2),
            "price_change_percent": round(float(price_change_percent), 2),
            "volume": info.get('volume'),
            "market_cap": market_cap,
            "market_cap_formatted": market_cap_formatted,
            "pe_ratio": info.get('trailingPE'),
            "week_52_high": info.get('fiftyTwoWeekHigh'),
            "week_52_low": info.get('fiftyTwoWeekLow'),
            "sector": info.get('sector'),
            "industry": info.get('industry'),
            "exchange": info.get('exchange'),
            "currency": info.get('currency', 'USD'),
            "last_updated": datetime.now().isoformat(),
        }
        
        # Clean up None values and format numbers
        cleaned_data = {}
        for key, value in financial_data.items():
            if value is not None:
                if key == 'volume' and isinstance(value, (int, float)):
                    cleaned_data[key] = format_volume(value)
                elif key in ['pe_ratio', 'week_52_high', 'week_52_low'] and isinstance(value, (int, float)):
                    cleaned_data[key] = round(float(value), 2)
                else:
                    cleaned_data[key] = value
        
        return cleaned_data
        
    except Exception as e:
        logger.error(f"Error fetching stock data for {ticker}: {str(e)}")
        return None

async def get_company_financial_data(company_name: str) -> Optional[Dict[str, Any]]:
    """
    Get financial data for a company by name
    
    Args:
        company_name: Company name to look up
        
    Returns:
        Financial data dictionary or None if not found/not public
    """
    # Extract ticker symbol
    ticker = extract_ticker_symbol(company_name)
    
    if not ticker:
        logger.info(f"No ticker found for company: {company_name}")
        return None
    
    # Fetch stock data
    return await get_stock_data(ticker)

def format_market_cap(market_cap: int) -> str:
    """Format market cap into human-readable format"""
    if not market_cap:
        return None
    
    if market_cap >= 1_000_000_000_000:  # Trillion
        return f"${market_cap / 1_000_000_000_000:.2f}T"
    elif market_cap >= 1_000_000_000:  # Billion
        return f"${market_cap / 1_000_000_000:.2f}B"
    elif market_cap >= 1_000_000:  # Million
        return f"${market_cap / 1_000_000:.2f}M"
    else:
        return f"${market_cap:,}"

def format_volume(volume: int) -> str:
    """Format trading volume into human-readable format"""
    if not volume:
        return None
    
    if volume >= 1_000_000:  # Million
        return f"{volume / 1_000_000:.1f}M"
    elif volume >= 1_000:  # Thousand
        return f"{volume / 1_000:.1f}K"
    else:
        return str(volume)

def is_market_open() -> bool:
    """
    Check if US stock market is currently open (basic check)
    This is a simplified check - in production you might want more sophisticated logic
    """
    now = datetime.now()
    # Basic check for weekdays and typical market hours (9:30 AM - 4:00 PM ET)
    # This doesn't account for holidays or timezone properly - for demo purposes
    return now.weekday() < 5 and 9 <= now.hour < 16

# Test function
async def test_financial_service():
    """Test the financial service with some known companies"""
    test_companies = ["Apple Inc", "Microsoft Corporation", "Unknown Company"]
    
    for company in test_companies:
        print(f"\nTesting: {company}")
        ticker = extract_ticker_symbol(company)
        print(f"Ticker: {ticker}")
        
        if ticker:
            data = await get_stock_data(ticker)
            if data:
                print(f"Price: ${data['current_price']} ({data['price_change']:+.2f}, {data['price_change_percent']:+.2f}%)")
                print(f"Market Cap: {data.get('market_cap_formatted', 'N/A')}")
            else:
                print("No financial data found")
        else:
            print("Private company or ticker not found")

if __name__ == "__main__":
    # Run test
    asyncio.run(test_financial_service())
