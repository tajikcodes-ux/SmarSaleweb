import { useState, useEffect } from 'react';
import { Bot, Send, BrainCircuit, Sparkles, AlertTriangle, ArrowRight, BarChart3 } from 'lucide-react';

interface ForecastItem {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  averageWeeklySales: number;
  predictedNextWeekDemand: number;
  confidenceScore: number;
  recommendation: string;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export default function AiAssistant() {
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Привет! Я твой AI-ассистент по аналитике SmartSale. Я могу дать сводку по сегодняшней выручке, активности агентов или остаткам товаров на складах. Спроси меня о чём-нибудь!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [queryInput, setQueryInput] = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      const isProductionEnv = !window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('192.168.');
      const baseApiUrl = isProductionEnv
        ? `${window.location.protocol}//${window.location.hostname}`
        : `http://${window.location.hostname}:4000`;
        
      const res = await fetch(`${baseApiUrl}/api/v1/ai/predictions/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setForecast(data);
      }
    } catch (e) {
      console.error('Failed to fetch forecast:', e);
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQueryInput('');
    setSendingQuery(true);

    try {
      const isProductionEnv = !window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('192.168.');
      const baseApiUrl = isProductionEnv
        ? `${window.location.protocol}//${window.location.hostname}`
        : `http://${window.location.hostname}:4000`;
        
      const res = await fetch(`${baseApiUrl}/api/v1/ai/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: textToSend }),
      });
      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          sender: 'ai',
          text: data.response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Извини, произошла сетевая ошибка при обработке запроса.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSendingQuery(false);
    }
  };

  const fastPrompts = [
    'Какая выручка за сегодня?',
    'Активность агентов на карте?',
    'Дефицит товаров на складах?',
  ];

  return (
    <div className="space-y-6">
      {/* Header card with Apple Glassmorphism styling */}
      <div className="p-6 rounded-2xl bg-white border border-[#e3e3e8] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-[#0071e3]" />
            Прикладная AI-Аналитика & Ассистент
          </h2>
          <p className="text-xs text-[#86868b] mt-1 font-medium">
            Служба прогнозирования спроса и диалоговый интерфейс принятия управленческих решений.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold bg-[#f5f5f7] border border-[#e3e3e8] px-3 py-2 rounded-xl text-[#515154]">
          <Sparkles className="w-4 h-4 text-[#0071e3]" />
          <span>Модель: SmartSale-Predict-v1.4</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Demand Forecasting Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e3e3e8] shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[#e3e3e8] flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0071e3]" />
              Прогноз спроса на следующую неделю
            </h3>
            <span className="text-[10px] bg-[#e8f5e9] text-[#2e7d32] font-bold px-2 py-0.5 rounded-full">
              Точность: 87.4%
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loadingForecast ? (
              <div className="p-10 text-center text-xs text-[#86868b]">Загрузка прогноза спроса...</div>
            ) : forecast.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#86868b]">Нет данных для построения прогноза спроса.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f5f5f7] border-b border-[#e3e3e8] text-[#86868b] font-semibold">
                    <th className="p-4">Товар</th>
                    <th className="p-4 text-center">Продано за неделю (ср)</th>
                    <th className="p-4 text-center">Прогноз спроса</th>
                    <th className="p-4 text-center">Уверенность AI</th>
                    <th className="p-4">Рекомендация</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e3e8]">
                  {forecast.map((item) => (
                    <tr key={item.productId} className="hover:bg-[#f5f5f7]/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-[#1d1d1f]">{item.name}</div>
                        <div className="text-[10px] text-[#86868b] mt-0.5">{item.sku}</div>
                      </td>
                      <td className="p-4 text-center font-medium text-[#515154]">
                        {item.averageWeeklySales.toFixed(1)} шт
                      </td>
                      <td className="p-4 text-center font-bold text-[#1d1d1f]">
                        {item.predictedNextWeekDemand} шт
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 bg-[#e3e3e8] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.confidenceScore > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${item.confidenceScore * 100}%` }}
                            />
                          </div>
                          <span className="font-bold text-[10px] text-[#515154]">
                            {(item.confidenceScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          item.predictedNextWeekDemand > 80 
                            ? 'bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]' 
                            : 'bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]'
                        }`}>
                          {item.recommendation.split(':')[0]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-4 bg-[#f5f5f7] border-t border-[#e3e3e8] flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#515154] leading-relaxed">
              **Важно:** Модель использует экспоненциальное сглаживание и сезонность дистрибуции на основе завершенных продаж. Рекомендуется корректировать планы закупок при падении уверенности (Confidence) ниже 60%.
            </p>
          </div>
        </div>

        {/* Right Column: AI Chatbot Window (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#e3e3e8] shadow-sm flex flex-col h-[550px] overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-[#e3e3e8] flex items-center gap-3 bg-[#f5f5f7]">
            <div className="w-8 h-8 rounded-lg bg-[#0071e3] flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#1d1d1f]">AI Ассистент Директора</h3>
              <span className="text-[9px] text-[#86868b] font-medium">Онлайн • Готов к вопросам</span>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
            {messages.map((msg, index) => {
              const isAi = msg.sender === 'ai';
              return (
                <div key={index} className={`flex ${isAi ? 'justify-start' : 'justify-end'} items-end gap-2`}>
                  {isAi && (
                    <div className="w-6 h-6 rounded bg-[#e3e3e8] flex items-center justify-center flex-shrink-0 text-[#0071e3]">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-xl p-3 shadow-sm text-xs leading-relaxed ${
                    isAi 
                      ? 'bg-white text-[#1d1d1f] border border-[#e3e3e8]' 
                      : 'bg-[#0071e3] text-white'
                  }`}>
                    <div>{msg.text}</div>
                    <div className={`text-[9px] mt-1 text-right ${isAi ? 'text-[#86868b]' : 'text-white/70'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}
            {sendingQuery && (
              <div className="flex justify-start items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#e3e3e8] flex items-center justify-center text-[#0071e3]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-[#e3e3e8] rounded-xl px-4 py-2.5 text-xs text-[#86868b] shadow-sm">
                  Анализирую данные в реальном времени...
                </div>
              </div>
            )}
          </div>

          {/* Fast Prompts list */}
          <div className="px-5 py-2 border-t border-[#e3e3e8] bg-[#f5f5f7]/50 flex flex-wrap gap-2">
            {fastPrompts.map((p, i) => (
              <button
                key={i}
                disabled={sendingQuery}
                onClick={() => handleSendMessage(p)}
                className="text-[10px] font-semibold bg-white hover:bg-[#f5f5f7] border border-[#e3e3e8] text-[#515154] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                {p}
                <ArrowRight className="w-2.5 h-2.5 text-[#86868b]" />
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-4 border-t border-[#e3e3e8] flex gap-2">
            <input
              type="text"
              value={queryInput}
              disabled={sendingQuery}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(queryInput)}
              placeholder="Спроси о выручке, складах или агентах..."
              className="flex-1 bg-[#f5f5f7] border border-[#e3e3e8] rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#0071e3] transition-colors"
            />
            <button
              onClick={() => handleSendMessage(queryInput)}
              disabled={sendingQuery || !queryInput.trim()}
              className="w-9 h-9 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
