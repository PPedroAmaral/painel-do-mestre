'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function PainelDoMestre() {
  const [personagens, setPersonagens] = useState([]);
  const [campanha, setCampanha] = useState(null);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const [termoBusca, setTermoBusca] = useState('');
  const [monstro, setMonstro] = useState(null);
  const [buscandoMonstro, setBuscandoMonstro] = useState(false);
  const [erroMonstro, setErroMonstro] = useState('');

  const [webhookUrl, setWebhookUrl] = useState('');
  const [enviandoDiscord, setEnviandoDiscord] = useState(false);
  
  const [novoPersonagem, setNovoPersonagem] = useState({ name: '', class: '', level: 1, max_hp: '', current_hp: '' });
  const [novoLog, setNovoLog] = useState({ character_id: '', damage_dealt: 0, damage_taken: 0, healing_done: 0 });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  async function carregarDados() {
    const { data: dadosCampanha } = await supabase.from('campaigns').select('*').eq('id', 1).single();
    // Ordena para que os vivos fiquem primeiro, e quem tem menos vida fique no topo
    const { data: dadosPersonagens } = await supabase.from('characters').select('*').eq('campaign_id', 1).order('is_dead', { ascending: true }).order('current_hp', { ascending: true });
    const { data: logsCombate } = await supabase.from('combat_logs').select('*').eq('session_id', 1);

    if (logsCombate && dadosPersonagens) {
      const dadosFormatados = dadosPersonagens.map((p) => {
        const logsDoPersonagem = logsCombate.filter(log => log.character_id === p.id);
        const danoTotal = logsDoPersonagem.reduce((acc, curr) => acc + curr.damage_dealt, 0);
        const curaTotal = logsDoPersonagem.reduce((acc, curr) => acc + curr.healing_done, 0);
        return { nome: p.name, Dano: danoTotal, Cura: curaTotal };
      });
      setDadosGrafico(dadosFormatados);
    }

    setCampanha(dadosCampanha);
    setPersonagens(dadosPersonagens || []);
    setCarregando(false);
  }

  useEffect(() => { carregarDados(); }, []);

  // --- NOVAS FUNÇÕES: DELETAR E TESTES DE MORTE ---

  async function deletarPersonagem(id, nome) {
    if (!window.confirm(`Tem certeza que deseja banir ${nome} para o abismo (excluir)?`)) return;
    await supabase.from('characters').delete().eq('id', id);
    carregarDados();
  }

  async function atualizarTesteMorte(id, personagem, tipo) {
    let atualizacao = {};
    
    if (tipo === 'sucesso') {
      const novosSucessos = personagem.death_saves_successes + 1;
      if (novosSucessos >= 3) {
        // Estabilizou! Volta com 1 de HP e zera os testes
        atualizacao = { current_hp: 1, death_saves_successes: 0, death_saves_failures: 0 };
      } else {
        atualizacao = { death_saves_successes: novosSucessos };
      }
    } else if (tipo === 'falha') {
      const novasFalhas = personagem.death_saves_failures + 1;
      if (novasFalhas >= 3) {
        // Morreu de vez
        atualizacao = { is_dead: true, current_hp: 0, death_saves_failures: 3 };
      } else {
        atualizacao = { death_saves_failures: novasFalhas };
      }
    }

    await supabase.from('characters').update(atualizacao).eq('id', id);
    carregarDados();
  }

  // --- FUNÇÕES EXISTENTES ---

  async function cadastrarPersonagem(e) {
    e.preventDefault();
    setSalvando(true);
    await supabase.from('characters').insert([{
      campaign_id: 1, name: novoPersonagem.name, class: novoPersonagem.class,
      level: parseInt(novoPersonagem.level), max_hp: parseInt(novoPersonagem.max_hp),
      current_hp: parseInt(novoPersonagem.current_hp || novoPersonagem.max_hp)
    }]);
    setNovoPersonagem({ name: '', class: '', level: 1, max_hp: '', current_hp: '' });
    await carregarDados();
    setSalvando(false);
  }

  async function registrarCombate(e) {
    e.preventDefault();
    if(!novoLog.character_id) return alert('Selecione um personagem!');
    setSalvando(true);

    const personagem = personagens.find(p => p.id === parseInt(novoLog.character_id));
    if (personagem && personagem.is_dead) {
      alert("Este personagem já está morto!");
      setSalvando(false);
      return;
    }

    await supabase.from('combat_logs').insert([{
      session_id: 1, character_id: parseInt(novoLog.character_id),
      damage_dealt: parseInt(novoLog.damage_dealt), damage_taken: parseInt(novoLog.damage_taken), healing_done: parseInt(novoLog.healing_done)
    }]);

    if (personagem) {
      let novaVida = personagem.current_hp - parseInt(novoLog.damage_taken) + parseInt(novoLog.healing_done);
      novaVida = Math.max(0, Math.min(personagem.max_hp, novaVida)); 
      
      let atualizacao = { current_hp: novaVida };
      
      // Se tomou dano enquanto estava com 0 HP (Regra de D&D: conta como falha no teste de morte)
      if (personagem.current_hp === 0 && parseInt(novoLog.damage_taken) > 0) {
        const novasFalhas = personagem.death_saves_failures + 1;
        atualizacao.death_saves_failures = novasFalhas;
        if (novasFalhas >= 3) atualizacao.is_dead = true;
      }
      
      await supabase.from('characters').update(atualizacao).eq('id', personagem.id);
    }

    setNovoLog({ character_id: '', damage_dealt: 0, damage_taken: 0, healing_done: 0 });
    await carregarDados();
    setSalvando(false);
  }

  async function buscarMonstro(e) {
    e.preventDefault();
    if (!termoBusca || termoBusca.trim() === '') return setErroMonstro('Digite o nome de um monstro.');
    setBuscandoMonstro(true); setErroMonstro(''); setMonstro(null);
    try {
      const res = await fetch(`https://www.dnd5eapi.co/api/monsters/${termoBusca.trim().toLowerCase().replace(/\s+/g, '-')}`);
      if (!res.ok) throw new Error('Monstro não encontrado.');
      const data = await res.json();
      if (data.count !== undefined) throw new Error('Nome genérico. Seja específico.');
      setMonstro(data);
    } catch (err) { setErroMonstro(err.message); } finally { setBuscandoMonstro(false); }
  }

  async function enviarResumoDiscord() {
    if (!webhookUrl) return alert("Cole a URL do Webhook do Discord no campo primeiro!");
    setEnviandoDiscord(true);

    const mortos = personagens.filter(p => p.is_dead).map(p => `\n🕯️ **${p.name}** seu corpo pode ter caído hoje, mas sua coragem e suas escolhas vão viver para sempre na memória de quem lutou ao seu lado.`);
    const mensagemMortos = mortos.length > 0 ? `\n${mortos.join('\n')}` : '';

    const camposPersonagens = dadosGrafico.map(dado => {
      const p = personagens.find(per => per.name === dado.nome);
      const icone = p?.is_dead ? '🪦' : '👤';
      return {
        name: `${icone} ${dado.nome}`,
        value: p?.is_dead ? `*Morto em combate.*\n⚔️ Dano Causado: ${dado.Dano}` : `⚔️ Dano Causado: ${dado.Dano}\n💚 Cura Recebida: ${dado.Cura}`,
        inline: true
      };
    });

    const payload = {
      username: "O Observador",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/4333/4333647.png", 
      embeds: [{
        title: `📢 Sessão Encerrada: ${campanha?.title}`,
        description: `O mestre salvou o progresso! Aqui estão as estatísticas atualizadas:${mensagemMortos}`,
        color: mortos.length > 0 ? 10031104 : 15158332, // Vermelho escuro se houver mortos
        fields: camposPersonagens,
        footer: { text: "Painel do Mestre • Automação Direta" }
      }]
    };

    try {
      await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      alert("Resumo enviado para o Discord com sucesso!");
    } catch (error) { alert("Erro ao enviar para o Discord."); } finally { setEnviandoDiscord(false); }
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100"><p className="animate-pulse">Abrindo o Grimório...</p></div>;

  return (
    <div className="min-h-screen transition-colors duration-300 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 p-8 font-sans">
      
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{campanha?.title || 'Campanha'}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Resumo da Última Sessão</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input type="password" placeholder="URL do Webhook..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-64 outline-none" />
          <button onClick={enviarResumoDiscord} disabled={enviandoDiscord} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium cursor-pointer">
            {enviandoDiscord ? 'Enviando...' : '📢 Avisar Discord'}
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-sm font-medium cursor-pointer">
            {darkMode ? '☀️ Claro' : '🌙 Escuro'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        
        {/* Barras de Vida e Testes de Morte */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {personagens.map((personagem) => {
            const porcentagemVida = (personagem.current_hp / personagem.max_hp) * 100;
            const emPerigo = porcentagemVida <= 30 && !personagem.is_dead;
            const caido = personagem.current_hp === 0 && !personagem.is_dead;
            
            return (
              <div key={personagem.id} className={`p-4 rounded-2xl border transition-all relative ${personagem.is_dead ? 'border-zinc-800 bg-zinc-100 dark:bg-zinc-900 grayscale opacity-60' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'} flex flex-col gap-2`}>
                
                {/* Botão Excluir */}
                <button onClick={() => deletarPersonagem(personagem.id, personagem.name)} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors text-sm cursor-pointer" title="Excluir Personagem">
                  ❌
                </button>

                <span className={`font-semibold ${personagem.is_dead ? 'line-through decoration-red-500' : ''}`}>
                  {personagem.name} <span className="text-xs font-normal text-zinc-500">({personagem.class})</span>
                </span>

                {personagem.is_dead ? (
                  <div className="mt-2 text-center py-2 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg text-sm font-bold text-zinc-600 dark:text-zinc-400">
                    💀 Morto em Combate
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm items-end mt-1">
                      <span className={emPerigo || caido ? 'text-red-500 font-bold' : 'text-zinc-600 dark:text-zinc-300'}>HP: {personagem.current_hp}/{personagem.max_hp}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${emPerigo || caido ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(0, Math.min(100, porcentagemVida))}%` }}></div>
                    </div>

                    {/* Testes de Morte (Aparece apenas com 0 HP) */}
                    {caido && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 block mb-2 text-center">Testes de Morte</span>
                        
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-emerald-600 font-medium">Sucessos:</span>
                          <div className="flex gap-1 cursor-pointer" onClick={() => atualizarTesteMorte(personagem.id, personagem, 'sucesso')}>
                            {[1, 2, 3].map(n => <div key={`s-${n}`} className={`w-4 h-4 rounded-full border border-emerald-500 ${personagem.death_saves_successes >= n ? 'bg-emerald-500' : 'bg-transparent'}`}></div>)}
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-red-600 font-medium">Falhas:</span>
                          <div className="flex gap-1 cursor-pointer" onClick={() => atualizarTesteMorte(personagem.id, personagem, 'falha')}>
                            {[1, 2, 3].map(n => <div key={`f-${n}`} className={`w-4 h-4 rounded-full border border-red-500 ${personagem.death_saves_failures >= n ? 'bg-red-500' : 'bg-transparent'}`}></div>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </section>

        {/* Gráfico e Bestiário */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="col-span-1 md:col-span-2 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-zinc-700 dark:text-zinc-300">Desempenho Geral</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e4e4e7'} vertical={false} />
                  <XAxis dataKey="nome" tick={{ fill: darkMode ? '#a1a1aa' : '#52525b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: darkMode ? '#a1a1aa' : '#52525b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#ffffff', borderColor: darkMode ? '#27272a' : '#27272a' , color: darkMode ? '#f4f4f5' : '#18181b', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                  <Bar dataKey="Dano" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dano Causado" />
                  <Bar dataKey="Cura" fill="#10b981" radius={[4, 4, 0, 0]} name="Cura Recebida" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="col-span-1 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-zinc-700 dark:text-zinc-300">Bestiário Rápido</h2>
            <form onSubmit={buscarMonstro} className="flex gap-2 mb-4">
              <input type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} placeholder="Ex: zombie" className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              <button type="submit" disabled={buscandoMonstro} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium cursor-pointer">{buscandoMonstro ? '...' : 'Ir'}</button>
            </form>
            {erroMonstro && <p className="text-xs text-red-500 mb-2">{erroMonstro}</p>}
            {monstro && (
              <div className="flex-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col gap-3">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400">{monstro?.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center"><span className="block text-xs text-zinc-500">AC</span><span className="font-bold">{monstro?.armor_class?.[0]?.value || '-'}</span></div>
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center"><span className="block text-xs text-zinc-500">HP</span><span className="font-bold">{monstro?.hit_points || '-'}</span></div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* CRUD Controls */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-zinc-700 dark:text-zinc-300">➕ Cadastrar Personagem</h2>
            <form onSubmit={cadastrarPersonagem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required type="text" placeholder="Nome" value={novoPersonagem.name} onChange={e => setNovoPersonagem({...novoPersonagem, name: e.target.value})} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none" />
                <input required type="text" placeholder="Classe" value={novoPersonagem.class} onChange={e => setNovoPersonagem({...novoPersonagem, class: e.target.value})} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" placeholder="Vida (HP)" value={novoPersonagem.max_hp} onChange={e => setNovoPersonagem({...novoPersonagem, max_hp: e.target.value})} className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none" />
                <button type="submit" disabled={salvando} className="px-4 py-2 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg text-sm font-medium cursor-pointer">
                  {salvando ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-zinc-700 dark:text-zinc-300">⚔️ Registrar Ação no Combate</h2>
            <form onSubmit={registrarCombate} className="space-y-3">
              <select required value={novoLog.character_id} onChange={e => setNovoLog({...novoLog, character_id: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none">
                <option value="">Selecione o Personagem...</option>
                {personagens.map(p => <option key={p.id} value={p.id}>{p.name} {p.is_dead ? '(Morto)' : ''}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Dano Causado</label>
                  <input type="number" min="0" value={novoLog.damage_dealt} onChange={e => setNovoLog({...novoLog, damage_dealt: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-red-500 block mb-1">Dano Tomado</label>
                  <input type="number" min="0" value={novoLog.damage_taken} onChange={e => setNovoLog({...novoLog, damage_taken: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-emerald-500 block mb-1">Cura Recebida</label>
                  <input type="number" min="0" value={novoLog.healing_done} onChange={e => setNovoLog({...novoLog, healing_done: e.target.value})} className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-300 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 outline-none" />
                </div>
              </div>
              <button type="submit" disabled={salvando} className="w-full px-4 py-2 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer">
                {salvando ? 'Registrando...' : 'Salvar Ação'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}