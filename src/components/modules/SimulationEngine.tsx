'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ShieldAlert,
  Flame,
  Radio,
  Sliders,
  CheckCircle2,
  Lock,
  Unlock,
  Activity,
  Server,
  Zap,
} from 'lucide-react';
import { Badge } from '../shared/Badge';

export const SimulationEngine: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [isContained, setIsContained] = useState<boolean>(false);

  const [netTargets, setNetTargets] = useState({
    localIP: '127.0.0.1',
    gateway: '127.0.0.1',
  });

  const [realMetrics, setRealMetrics] = useState({
    targetHost: '',
    targetPort: 0,
    socketStatus: 'READY',
    latencyMs: 0,
    packetsSent: 0,
    timestamp: 'Idle',
  });

  useEffect(() => {
    const isErased =
      typeof window !== 'undefined' &&
      localStorage.getItem('medshield_fresh_clean_state') === 'true';

    fetch('/api/network')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setNetTargets({
            localIP: json.data.localIP || '127.0.0.1',
            gateway: json.data.gateway || '127.0.0.1',
          });
          if (!isErased) {
            setRealMetrics((prev) => ({
              ...prev,
              targetHost: json.data.localIP || '127.0.0.1',
              targetPort: 3000,
            }));
          }
        }
      })
      .catch(() => {});

    if (isErased) {
      setRealMetrics({
        targetHost: '',
        targetPort: 0,
        socketStatus: 'IDLE',
        latencyMs: 0,
        packetsSent: 0,
        timestamp: 'Reset State',
      });
    }

    // Listen for global reset all data
    const handleGlobalReset = () => {
      setIsPlaying(false);
      setStepIndex(0);
      setIsContained(false);
      setRealMetrics({
        targetHost: '',
        targetPort: 0,
        socketStatus: 'IDLE',
        latencyMs: 0,
        packetsSent: 0,
        timestamp: 'Reset State',
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('medshield-reset-all-data', handleGlobalReset);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('medshield-reset-all-data', handleGlobalReset);
      }
    };
  }, []);

  const steps = [
    {
      stepNumber: 1,
      targetHost: netTargets.localIP,
      targetPort: 3000,
      action: 'Probe Local Cyber Mirror Service Port 3000',
      description: 'Testing actual local listening TCP port 3000 for open HTTP session.',
      mitre: 'Execution (T1204)',
      severity: 'low',
    },
    {
      stepNumber: 2,
      targetHost: netTargets.localIP,
      targetPort: 445,
      action: 'Probe Host Microsoft-DS / SMB Port 445',
      description: 'Executing real TCP connect test against local Microsoft-DS service.',
      mitre: 'Lateral Movement Probe (T1210)',
      severity: 'medium',
    },
    {
      stepNumber: 3,
      targetHost: netTargets.gateway,
      targetPort: 53,
      action: 'Probe Default Gateway DNS Service Port 53',
      description: 'Executing actual TCP socket connection to Router DNS resolver.',
      mitre: 'Command & Control DNS Query (T1071.004)',
      severity: 'high',
    },
    {
      stepNumber: 4,
      targetHost: netTargets.gateway,
      targetPort: 80,
      action: 'Probe Gateway Web Administration Port 80',
      description: 'Real socket transmission to default gateway HTTP administration interface.',
      mitre: 'Initial Access / Recon (T1190)',
      severity: 'critical',
    },
  ];

  const currentStep = steps[stepIndex] || steps[0];

  const executeRealProbe = async (st: typeof steps[0]) => {
    if (!st || !st.targetHost) return;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medshield_fresh_clean_state');
    }
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetHost: st.targetHost,
          targetPort: st.targetPort,
          action: st.action,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRealMetrics((prev) => ({
          targetHost: json.data.targetHost,
          targetPort: json.data.targetPort,
          socketStatus: json.data.socketStatus,
          latencyMs: json.data.latencyMs,
          packetsSent: prev.packetsSent + 1,
          timestamp: json.data.timestamp,
        }));
      }
    } catch (e) {}
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && !isContained) {
      executeRealProbe(currentStep);
      timer = setTimeout(() => {
        if (stepIndex < steps.length - 1) {
          setStepIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 3000 / speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, speed, isContained]);

  return (
    <div className="space-y-5 pb-6">
      {/* Title & Emergency Containment Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Cyber Mirror Simulation Engine
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            Live Socket Prober Executing Real TCP Probes Against Local Subnet Targets
          </p>
        </div>

        <button
          onClick={() => {
            setIsContained(!isContained);
            if (!isContained) setIsPlaying(false);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition shadow-sm ${
            isContained
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {isContained ? (
            <>
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Micro-Isolation Sandbox Active</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4 text-emerald-600" />
              <span>Trigger Sandbox Micro-Isolation</span>
            </>
          )}
        </button>
      </div>

      {/* Smansys Media Controls Card */}
      <div className="smansys-card p-5 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              if (!isPlaying) executeRealProbe(currentStep);
            }}
            disabled={isContained}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-xs transition shadow-sm ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            } disabled:opacity-40`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Live Probes</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (stepIndex < steps.length - 1) {
                const next = stepIndex + 1;
                setStepIndex(next);
                executeRealProbe(steps[next]);
              }
            }}
            disabled={isPlaying || stepIndex >= steps.length - 1}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold disabled:opacity-30 transition"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Step</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setStepIndex(0);
              setIsContained(false);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  speed === spd
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Real Live Telemetry Stats */}
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Socket Target:</span>
            <p className="font-mono text-indigo-600 font-bold">
              {realMetrics.targetHost ? `${realMetrics.targetHost}:${realMetrics.targetPort}` : 'Ready'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Port Status:</span>
            <p
              className={`font-mono font-bold ${
                realMetrics.socketStatus === 'PORT_OPEN' ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {realMetrics.socketStatus}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">RTT Latency:</span>
            <p className="font-mono text-slate-800 font-bold">{realMetrics.latencyMs} ms</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Step Details & Step Sequence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 smansys-card p-6 bg-white space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                <h3 className="font-bold text-sm text-slate-900">
                  Live Socket Probe Execution
                </h3>
              </div>
              <Badge variant={currentStep.severity === 'critical' ? 'red' : 'green'} pulse={isPlaying}>
                {currentStep.severity.toUpperCase()} IMPACT
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-indigo-600 font-semibold">{currentStep.mitre}</span>
                <span className="text-slate-400">Step {stepIndex + 1} of {steps.length}</span>
              </div>

              <h4 className="text-base font-bold text-slate-900">{currentStep.action}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{currentStep.description}</p>

              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700">
                <span className="text-slate-400">Target Endpoint: </span>
                <strong className="text-slate-900">{currentStep.targetHost}</strong> on TCP Port <strong className="text-indigo-600">{currentStep.targetPort}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Probe Response Status</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{realMetrics.socketStatus}</p>
                <p className="text-[10px] text-slate-400 font-mono">{realMetrics.timestamp}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400">Roundtrip Latency</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{realMetrics.latencyMs} ms</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Probes Sent: {realMetrics.packetsSent}</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>
              <strong>Phase 1 Scope Strict Boundary:</strong> Qwen-RAG AI reasoning &amp; automated remediation disabled.
            </span>
            <span className="text-slate-400 font-mono">Phase 2 Reserved</span>
          </div>
        </div>

        {/* Step Sequence Card */}
        <div className="lg:col-span-5 smansys-card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Probe Sequence</h3>
            <span className="text-xs text-slate-400 font-mono">{steps.length} Real Targets</span>
          </div>

          <div className="space-y-3">
            {steps.map((st, idx) => {
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;

              return (
                <div
                  key={st.stepNumber}
                  onClick={() => {
                    setStepIndex(idx);
                    executeRealProbe(st);
                  }}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                      : isPast
                      ? 'bg-slate-50/60 border-slate-100 opacity-80'
                      : 'bg-white border-slate-100 opacity-60'
                  }`}
                >
                  <div className="mt-0.5">
                    {isCurrent ? (
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {st.stepNumber}
                      </span>
                    ) : isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs flex items-center justify-center font-bold">
                        {st.stepNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{st.action}</h4>
                      <span className="text-[10px] font-mono text-indigo-600 font-semibold">Port {st.targetPort}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{st.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
