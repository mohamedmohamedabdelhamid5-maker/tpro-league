import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trophy,
  Crown,
  TrendingUp,
  User,
  Activity,
  Zap,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
  Database,
  ShieldCheck,
  Medal,
  DollarSign,
  TrendingDown,
  Minus,
  Target,
  Flame,
  Swords,
  ShieldAlert,
  Link2,
} from "lucide-react";

// ==========================================
// 🔗 رابط جدول بيانات جوجل (SHEET URL)
// يمكنك تغيير الرابط أدناه في أي وقت لتغيير مصدر البيانات
// ==========================================
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqDhCU2YZ40OJi1AD32sKR7-PKUBGObJdk29t_lbIoXWNUS_ClAjrypP_ybSBqJmisnbR9ubd_PB9s/pub?gid=561436482&single=true&output=csv";

const REFRESH_INTERVAL = 45000;

// --- Components ---

// 1. Mini Performance Graph Component
const MiniGraph = ({ trend, color }) => {
  const points =
    trend === "up"
      ? "0,15 5,10 10,12 15,5 20,8 25,2"
      : "0,2 5,8 10,5 15,12 20,10 25,15";
  return (
    <svg className="w-12 h-6 opacity-50" viewBox="0 0 25 20">
      <polyline
        fill="none"
        stroke={color || "#ccc"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// 2. Badge Icon Component
const BadgeIcons = ({ rank, points }) => {
  const safePoints = (points || "0").toString().replace(/[^0-9]/g, "");
  const pts = parseInt(safePoints) || 0;

  return (
    <div className="flex gap-1 mt-2">
      {rank === 1 && (
        <Trophy className="w-3 h-3 text-yellow-500" title="Season Leader" />
      )}
      {pts > 1500 && (
        <Flame className="w-3 h-3 text-orange-500" title="High Scorer" />
      )}
      {rank <= 5 && (
        <ShieldCheck className="w-3 h-3 text-blue-400" title="Elite Guard" />
      )}
      <Target
        className="w-3 h-3 text-emerald-400 opacity-60"
        title="Sharpshooter"
      />
    </div>
  );
};

// 3. XP Progress Bar Component
const XPBar = ({ points, rank }) => {
  const safePoints = (points || "0").toString().replace(/[^0-9]/g, "");
  const pts = parseInt(safePoints) || 0;

  const max = 2500;
  const progress = Math.min((pts / max) * 100, 100);
  const getLevel = () => {
    if (rank === 1) return "LEGEND";
    if (rank <= 3) return "ELITE";
    if (pts > 1500) return "GOLD";
    return "BRONZE";
  };

  return (
    <div className="w-full mt-3">
      <div className="flex justify-between text-[8px] font-black tracking-widest text-slate-500 mb-1">
        <span>LVL: {getLevel()}</span>
        <span>{Math.floor(progress)}% XP</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const App = () => {
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState("connecting");
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());

  const FALLBACK_DATA = useMemo(
    () => [
      {
        id: "u1",
        rank: 1,
        name: "Hassan Ramadan Gaber Gadallah",
        team: "Zenith Strikers",
        points: "1840",
        price: "$92",
        trend: "up",
      },
      {
        id: "u2",
        rank: 2,
        name: "Mahmoud Nasr mahmoud Ahmed",
        team: "Nova City FC",
        points: "1560",
        price: "$78",
        trend: "up",
      },
      {
        id: "u3",
        rank: 3,
        name: "Abdallah Sobhy bayomi kanawy said",
        team: "Apex United",
        points: "1440",
        price: "$72",
        trend: "stable",
      },
      {
        id: "u4",
        rank: 4,
        name: "Ammar Mostafa Sayed Mohamed",
        team: "Sterling XI",
        points: "1420",
        price: "$71",
        trend: "down",
      },
      {
        id: "u5",
        rank: 5,
        name: "Salsbil samy aly saadaldein",
        team: "Crimson Rovers",
        points: "1400",
        price: "$70",
        trend: "stable",
      },
      {
        id: "u6",
        rank: 6,
        name: "Alaa Ahmed Ibrahim Ibrahim",
        team: "Cobalt Wanderers",
        points: "1400",
        price: "$70",
        trend: "up",
      },
      {
        id: "u7",
        rank: 7,
        name: "shehab mohamed ali sayed",
        team: "Onyx Athletic",
        points: "1320",
        price: "$66",
        trend: "down",
      },
      {
        id: "u8",
        rank: 8,
        name: "Mohamed Ashraf Mohamed Eldohma",
        team: "Pinnacle FC",
        points: "1280",
        price: "$64",
        trend: "stable",
      },
      {
        id: "u9",
        rank: 9,
        name: "Basmala Mohamed abead Abdelnaby",
        team: "Vanguard City",
        points: "1270",
        price: "$64",
        trend: "down",
      },
      {
        id: "u10",
        rank: 10,
        name: "Majda Mohamed Abdullah Hassan",
        team: "Titan Hotspur",
        points: "1155",
        price: "$58",
        trend: "up",
      },
    ],
    []
  );

  const fetchData = useCallback(
    async (isManual = false) => {
      setIsLoading(true);
      setError(null);
      const fullUrl = `${SHEET_URL}&nocache=${Date.now()}`;

      try {
        const response = await fetch(fullUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("فشل في الاتصال بالخادم");

        const csvText = await response.text();
        if (!csvText) throw new Error("الملف المستلم فارغ");

        const rows = csvText
          .split(/\r?\n/)
          .filter((row) => row && row.trim().length > 0);

        if (rows.length < 2)
          throw new Error("الجدول لا يحتوي على بيانات كافية");

        const data = rows
          .slice(1)
          .map((row, index) => {
            if (!row) return null;
            const cols = (row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) || []).map(
              (c) => (c ? c.trim().replace(/^"|"$/g, "") : "")
            );

            return {
              id: `live-${index}`,
              rank: parseInt(cols[0]) || index + 1,
              name: cols[1] || "Anonymous Titan",
              team: cols[2] || "Unassigned Squad",
              points: (cols[3] || "0").toString(),
              price: (cols[4] || "$0").toString(),
              trend: (cols[5] || "stable").toString().toLowerCase().trim(),
            };
          })
          .filter(
            (item) => item && item.name && item.name !== "Anonymous Titan"
          );

        if (data.length === 0)
          throw new Error("لم يتم العثور على لاعبين في الملف");

        setRankings(data);
        setDataSource("live");
        setLastSync(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn("Fetch failed, using fallback:", err.message);
        setRankings(FALLBACK_DATA);
        setDataSource("demo");
        if (isManual)
          setError(
            "الخادم غير مستجيب حالياً أو أن تنسيق البيانات في جوجل شيت غير متوافق."
          );
      } finally {
        setIsLoading(false);
      }
    },
    [FALLBACK_DATA]
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans selection:bg-yellow-500/30 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-yellow-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-20">
        {/* --- HEADER SECTION --- */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <div className="bg-yellow-500/10 p-2.5 rounded-2xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                <Swords className="text-yellow-500 w-6 h-6" />
              </div>
              <span className="text-yellow-500 font-black tracking-[0.4em] text-[10px] uppercase drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                T-Pro Elite Arena
              </span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter text-white uppercase leading-[0.75] mb-6">
              LEAGUE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-amber-700">
                TITANS
              </span>
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="bg-white/5 border border-white/10 px-5 py-2 rounded-2xl backdrop-blur-xl">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">
                  Current Match
                </p>
                <p className="text-sm font-bold text-white uppercase">
                  Week 32 • Finals
                </p>
              </div>
              <div
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
                  dataSource === "live"
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/5 border-amber-500/20 text-amber-500"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    dataSource === "live"
                      ? "bg-emerald-400 animate-ping"
                      : "bg-amber-500 animate-pulse"
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-widest">
                  {dataSource === "live" ? "Live System" : "Demo Mode"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-5">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center min-w-[120px]">
                <p className="text-[9px] text-slate-500 font-black uppercase mb-1">
                  Prize Pool
                </p>
                <p className="text-xl font-black text-yellow-500">$25,000</p>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center min-w-[120px]">
                <p className="text-[9px] text-slate-500 font-black uppercase mb-1">
                  Active Pros
                </p>
                <p className="text-xl font-black text-white">1,240</p>
              </div>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={isLoading}
              className="group relative p-[1px] rounded-full overflow-hidden transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-amber-200 to-yellow-600 animate-gradient-x" />
              <div className="bg-slate-950 px-10 py-5 rounded-full relative flex items-center gap-4 transition-colors group-hover:bg-slate-900/50">
                <div className="text-right" dir="rtl">
                  <div className="text-[8px] text-yellow-500/70 uppercase font-black tracking-widest mb-1 leading-none">
                    تزامن البيانات
                  </div>
                  <div className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                    Update Feed
                  </div>
                </div>
                <RefreshCw
                  className={`w-5 h-5 text-yellow-500 ${
                    isLoading
                      ? "animate-spin"
                      : "group-hover:rotate-180 transition-transform duration-700"
                  }`}
                />
              </div>
            </button>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Last Sync: <span className="text-slate-300">{lastSync}</span>
            </p>
          </div>
        </header>

        {/* --- PODIUM SECTION --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end mb-24 px-2">
          {rankings &&
            rankings.length > 0 &&
            rankings.slice(0, 3).map((player, idx) => {
              if (!player) return null;
              const isFirst = player.rank === 1;
              const borderGlow = isFirst
                ? "border-yellow-500/40 shadow-[0_30px_100px_rgba(234,179,8,0.15)]"
                : "border-white/10 shadow-xl";

              return (
                <div
                  key={player.id || idx}
                  className={`relative group rounded-[3.5rem] border transition-all duration-700 hover:-translate-y-4 p-10 ${
                    isFirst
                      ? "bg-gradient-to-b from-yellow-500/15 via-transparent to-transparent md:scale-110 z-20"
                      : "bg-white/[0.03]"
                  } ${borderGlow}`}
                >
                  {isFirst && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <Crown className="w-14 h-14 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,1)] animate-bounce" />
                      <div className="bg-yellow-500 text-slate-950 text-[9px] font-black px-5 py-1 rounded-full uppercase tracking-[0.3em] -mt-3 shadow-2xl">
                        Season Legend
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-8">
                      <div
                        className={`w-32 h-32 rounded-full overflow-hidden border-[4px] ${
                          isFirst ? "border-yellow-400" : "border-slate-700"
                        } p-2 bg-slate-900/50 backdrop-blur-md relative group-hover:scale-105 transition-transform duration-500`}
                      >
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 rounded-full flex items-center justify-center">
                          <User
                            className={`w-16 h-16 ${
                              isFirst ? "text-yellow-500/30" : "text-slate-700"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="absolute -bottom-3 -right-3 scale-150 drop-shadow-xl">
                        <div
                          className={`bg-gradient-to-br ${
                            isFirst
                              ? "from-yellow-400 to-yellow-600 shadow-yellow-500/50"
                              : "from-slate-400 to-slate-600 shadow-slate-500/30"
                          } p-[2px] rounded-full`}
                        >
                          <div className="bg-slate-900 rounded-full w-9 h-9 flex items-center justify-center">
                            <span className="text-xs font-black text-white italic">
                              #{player.rank}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 group-hover:text-yellow-400 transition-colors uppercase tracking-tighter leading-tight max-w-[220px] break-words">
                      {(player.name || "Unknown").toUpperCase()}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-6 italic opacity-70">
                      {player.team || "No Team"}
                    </p>

                    <BadgeIcons rank={player.rank} points={player.points} />
                    <XPBar points={player.points} rank={player.rank} />

                    <div className="grid grid-cols-2 w-full gap-6 pt-8 mt-6 border-t border-white/5 relative">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0a0b0d] border border-white/5 rotate-45 flex items-center justify-center text-yellow-500/50">
                        <Zap className="w-5 h-5 -rotate-45" />
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-slate-600 uppercase block font-black mb-1 tracking-widest italic">
                          Points
                        </span>
                        <span className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none">
                          {player.points || "0"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-600 uppercase block font-black mb-1 tracking-widest italic">
                          Price
                        </span>
                        <span className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none">
                          {player.price || "$0"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 flex items-center justify-center gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                      <MiniGraph
                        trend={player.trend}
                        color={player.trend === "up" ? "#fbbf24" : "#ef4444"}
                      />
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        Performance Flow
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </section>

        {/* --- LIST SECTION --- */}
        <section className="px-2 pb-24">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[4rem] border border-white/10 overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-10 text-[10px] uppercase font-black tracking-[0.4em] text-slate-500 border-b border-white/5 bg-white/[0.01]">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-6 px-6">Elite Manager & Squadron</div>
              <div className="col-span-2 text-right">Market Value</div>
              <div className="col-span-3 text-right">Total Score</div>
            </div>

            {rankings &&
              rankings.length > 3 &&
              rankings.slice(3).map((player, idx) => {
                if (!player) return null;
                return (
                  <div
                    key={player.id || idx}
                    className="grid grid-cols-12 gap-4 p-8 md:p-10 items-center border-b border-white/5 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="col-span-2 md:col-span-1 flex justify-center">
                      <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-slate-500 font-black text-lg group-hover:text-yellow-500 group-hover:border-yellow-500/30 transition-all">
                        #{player.rank}
                      </div>
                    </div>

                    <div
                      className="col-span-10 md:col-span-6 flex items-center gap-8 text-right"
                      dir="rtl"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center border border-white/10 group-hover:border-yellow-500/50 transition-all shadow-xl">
                          <Activity className="w-8 h-8 text-slate-700 group-hover:text-yellow-500 transition-colors" />
                        </div>
                        {player.trend === "up" && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-[#0a0b0d]">
                            <TrendingUp className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-black text-white text-2xl group-hover:text-yellow-400 transition-colors uppercase tracking-tight mb-1 leading-tight">
                          {player.name}
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <BadgeIcons
                            rank={player.rank}
                            points={player.points}
                          />
                          <div className="w-1 h-1 bg-slate-700 rounded-full mt-2" />
                          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] italic mt-2">
                            {player.team}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex col-span-2 flex-col items-end">
                      <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">
                        League Price
                      </div>
                      <div className="text-2xl font-black text-slate-300 tabular-nums">
                        {player.price}
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-3 text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-white/5">
                      <div className="md:hidden text-[9px] text-slate-500 font-black uppercase">
                        Total Score
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none mb-2">
                          {player.points}
                        </div>
                        <div
                          className={`flex items-center gap-2 text-[9px] font-black uppercase px-4 py-1.5 rounded-full border shadow-sm ${
                            player.trend === "up"
                              ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                              : player.trend === "down"
                              ? "text-rose-400 border-rose-500/20 bg-rose-500/5"
                              : "text-slate-500 border-white/10 bg-white/5"
                          }`}
                        >
                          {player.trend === "up" ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : player.trend === "down" ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {player.trend === "up"
                            ? "Top Gainer"
                            : player.trend === "down"
                            ? "Selling"
                            : "Stable"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="px-12 py-16 bg-white/[0.01] rounded-[4rem] border border-white/5 mb-12 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left relative overflow-hidden group">
          <div className="absolute inset-0 bg-yellow-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-wrap items-center justify-center gap-12 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-3xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-xl">
                <Zap className="w-7 h-7 text-yellow-500 fill-yellow-500" />
              </div>
              <div>
                <div className="text-[9px] uppercase font-black tracking-[0.4em] text-slate-600 mb-1">
                  Architecture Feed
                </div>
                <div className="text-sm font-black text-white uppercase italic tracking-tighter">
                  Global Relay v9.5.0
                </div>
              </div>
            </div>
            {/* عرض الرابط في الفوتر لسهولة الوصول */}
            <a
              href={SHEET_URL.split("&")[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-5 hover:bg-white/5 p-4 rounded-3xl transition-all"
            >
              <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-xl">
                <Link2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <div className="text-[9px] uppercase font-black tracking-[0.4em] text-slate-600 mb-1">
                  Data Source
                </div>
                <div className="text-sm font-black text-white uppercase italic tracking-tighter underline">
                  Google Sheet CSV
                </div>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-10 relative z-10">
            <div className="text-center md:text-right">
              <div className="text-[9px] text-slate-600 font-black uppercase tracking-[0.5em] mb-2">
                Systems Design By
              </div>
              <div className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">
                T-PRO <span className="text-yellow-500">DIGITAL</span> SYSTEMS
              </div>
            </div>
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-yellow-600 to-amber-950 rounded-[3rem] flex items-center justify-center shadow-[0_20px_50px_rgba(234,179,8,0.4)] transform hover:rotate-12 transition-transform duration-500 cursor-help">
              <Trophy className="w-12 h-12 text-slate-950" />
            </div>
          </div>
        </footer>
      </main>

      {/* Error Toasts */}
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="bg-rose-600 text-white px-10 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-5 border border-white/20">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <span dir="rtl" className="text-sm">
              {error}
            </span>
            <button
              onClick={() => fetchData(true)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
