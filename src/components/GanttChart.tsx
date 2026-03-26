import { useState, useMemo } from 'react';
import { Project, mockProcessLibrary, GraphNode, GraphEdge } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar, Clock, User, AlertTriangle, GripVertical, Network, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

export function GanttChart({ project, onUpdateProject }: { project: Project, onUpdateProject?: (p: Project) => void }) {
  const tasks = project.ganttTasks;
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate dynamic start and end dates based on tasks
  const { startDate, endDate, totalDays, days } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { startDate: today, endDate: today, totalDays: 1, days: [today] };
    }

    let minDate = new Date(tasks[0].start);
    let maxDate = new Date(tasks[0].end);

    tasks.forEach(task => {
      const start = new Date(task.start);
      const end = new Date(task.end);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    // Add some padding
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 5);

    const totalDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const days = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(minDate);
      d.setDate(d.getDate() + i);
      return d;
    });

    return { startDate: minDate, endDate: maxDate, totalDays, days };
  }, [tasks]);

  const getTaskStyle = (taskStart: string, taskEnd: string) => {
    const start = new Date(taskStart);
    const end = new Date(taskEnd);
    
    const startOffset = Math.round((start.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const conflicts = useMemo(() => {
    const conflictAreas: { start: Date, end: Date, resource: string }[] = [];
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        if (tasks[i].resource === tasks[j].resource) {
          const start1 = new Date(tasks[i].start);
          const end1 = new Date(tasks[i].end);
          const start2 = new Date(tasks[j].start);
          const end2 = new Date(tasks[j].end);
          
          if (start1 <= end2 && start2 <= end1) {
            conflictAreas.push({
              start: new Date(Math.max(start1.getTime(), start2.getTime())),
              end: new Date(Math.min(end1.getTime(), end2.getTime())),
              resource: tasks[i].resource
            });
          }
        }
      }
    }
    return conflictAreas;
  }, [tasks]);

  const handleGenerateNodes = () => {
    if (!onUpdateProject) return;
    setIsGenerating(true);
    
    setTimeout(() => {
      const newNodes: GraphNode[] = [];
      const newEdges: GraphEdge[] = [];
      
      tasks.forEach((task, index) => {
        // Try to find a matching process template based on task name
        const template = mockProcessLibrary.find(p => task.name.includes(p.name.replace('标准', '')));
        
        if (template) {
          // Generate sub-nodes
          const subNodeIds: string[] = [];
          template.subNodes.forEach((subNode, subIndex) => {
            const newNodeId = `${task.id}_sub_${subIndex}`;
            subNodeIds.push(newNodeId);
            newNodes.push({
              ...subNode,
              id: newNodeId,
              name: `${task.name} - ${subNode.name}`,
              status: 'not_started',
              isCritical: false
            });
          });
          
          // Generate sub-edges
          template.subEdges.forEach(edge => {
            const fromIndex = template.subNodes.findIndex(n => n.id === edge.from);
            const toIndex = template.subNodes.findIndex(n => n.id === edge.to);
            if (fromIndex !== -1 && toIndex !== -1) {
              newEdges.push({
                from: subNodeIds[fromIndex],
                to: subNodeIds[toIndex],
                type: edge.type,
                lag: edge.lag
              });
            }
          });
          
          // Connect to dependencies
          task.dependencies.forEach(depId => {
            // Find the last sub-node of the dependency
            const depTask = tasks.find(t => t.id === depId);
            if (depTask) {
               // For simplicity, just connect the first sub-node of this task to the dependency task's ID (which would be replaced by its last sub-node in a real scenario)
               // In this mock, we assume dependencies are simple finish_to_start
               newEdges.push({
                 from: depId, // This is a simplification. Ideally, we link from the LAST sub-node of the dependency.
                 to: subNodeIds[0],
                 type: 'finish_to_start'
               });
            }
          });
          
        } else {
          // Generic node generation
          newNodes.push({
            id: task.id,
            type: 'task',
            name: task.name,
            duration: Math.round((new Date(task.end).getTime() - new Date(task.start).getTime()) / (1000 * 60 * 60 * 24)) + 1,
            resources: [task.resource],
            materials: [],
            rules: [],
            plannedCost: { material: 0, labor: 1000, equipment: 0, overhead: 0, total: 1000 },
            status: task.status || 'not_started',
            isCritical: false
          });
          
          task.dependencies.forEach(depId => {
            newEdges.push({
              from: depId,
              to: task.id,
              type: 'finish_to_start'
            });
          });
        }
      });
      
      // Fix up edges that point to parent task IDs instead of sub-node IDs
      const finalEdges = newEdges.map(edge => {
        let from = edge.from;
        let to = edge.to;
        
        // If 'from' is a parent task ID that was expanded, find its last sub-node
        if (!newNodes.find(n => n.id === from)) {
           const subNodes = newNodes.filter(n => n.id.startsWith(`${from}_sub_`));
           if (subNodes.length > 0) {
             from = subNodes[subNodes.length - 1].id;
           }
        }
        
        // If 'to' is a parent task ID that was expanded, find its first sub-node
        if (!newNodes.find(n => n.id === to)) {
           const subNodes = newNodes.filter(n => n.id.startsWith(`${to}_sub_`));
           if (subNodes.length > 0) {
             to = subNodes[0].id;
           }
        }
        
        return { ...edge, from, to };
      });

      onUpdateProject({
        ...project,
        nodes: newNodes,
        edges: finalEdges
      });
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-xl">排产甘特图 (Timeline Gantt)</h2>
        <Button 
          onClick={handleGenerateNodes} 
          disabled={isGenerating || tasks.length === 0}
          className="font-mono text-xs flex items-center gap-2"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
          {isGenerating ? '正在生成节点网络...' : '自动生成节点网络 (Auto-Generate Graph)'}
        </Button>
      </div>

      <Card className="flex-1 rounded-none border-border shadow-none flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4" /> 生产排期 (Production Schedule)
          </CardTitle>
          {conflicts.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono text-destructive bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
              <AlertTriangle className="w-3 h-3" />
              <span>检测到 {conflicts.length} 处资源冲突</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-auto flex flex-col">
          <div className="min-w-[1000px] flex-1 flex flex-col">
            {/* Header */}
            <div className="flex border-b border-border bg-muted/50 sticky top-0 z-30">
              <div className="w-80 shrink-0 border-r border-border p-3 font-mono text-xs uppercase text-muted-foreground flex items-center bg-muted/50">
                任务信息 (Tasks)
              </div>
              <div className="flex-1 flex relative">
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 border-r border-border/30 p-2 text-center text-[10px] font-mono relative ${isWeekend ? 'bg-muted/30 text-muted-foreground/50' : 'text-muted-foreground'} ${isToday ? 'bg-primary/10 text-primary font-bold' : ''}`}
                      style={{ minWidth: '30px' }}
                    >
                      <div className="font-bold">{day.getDate()}</div>
                      <div className="text-[8px] opacity-70">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      {isToday && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto relative bg-background">
              {/* Grid lines */}
              <div className="absolute inset-0 flex ml-80 pointer-events-none z-0">
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 border-r border-border/10 h-full relative ${isWeekend ? 'bg-muted/10' : ''}`} 
                      style={{ minWidth: '30px' }}
                    >
                      {isToday && <div className="absolute top-0 bottom-0 left-0 border-l-2 border-primary/50 z-20"></div>}
                    </div>
                  );
                })}
              </div>

              {/* Conflict Highlights */}
              <div className="absolute inset-0 ml-80 pointer-events-none z-10">
                {conflicts.map((conflict, i) => {
                  const style = getTaskStyle(conflict.start.toISOString(), conflict.end.toISOString());
                  return (
                    <div 
                      key={`conflict-${i}`}
                      className="absolute top-0 bottom-0 bg-destructive/10 border-x border-destructive/30 flex flex-col items-center pt-2"
                      style={style}
                    >
                      <div className="sticky top-2 bg-destructive text-destructive-foreground text-[10px] font-mono px-2 py-0.5 rounded-sm shadow-sm flex items-center gap-1 whitespace-nowrap z-20">
                        <AlertTriangle className="w-3 h-3" />
                        冲突: {conflict.resource}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tasks */}
              <div className="relative z-20">
                {tasks.map((task) => {
                  const isCritical = project.nodes.find(n => n.id === task.id)?.isCritical;
                  
                  return (
                  <div key={task.id} className="flex border-b border-border/50 hover:bg-muted/5 transition-colors group">
                    <div className="w-80 shrink-0 border-r border-border p-3 flex flex-col justify-center gap-1 bg-background relative">
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground hover:text-foreground transition-opacity">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex items-center justify-between pl-4">
                        <div className="flex items-center gap-2">
                          <div className="font-sans text-sm font-medium truncate" title={task.name}>{task.name}</div>
                          {isCritical && (
                            <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" title="关键路径节点 (Critical Path Node)" />
                          )}
                        </div>
                        {task.status === 'delayed' && <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground pl-4">
                        <span className="flex items-center gap-1 truncate" title={task.resource}>
                          <User className="w-3 h-3" /> 
                          <span className={conflicts.some(c => c.resource === task.resource) ? 'text-destructive font-bold' : ''}>{task.resource}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" /> {task.progress}%</span>
                      </div>
                    </div>
                    <div className="flex-1 relative py-3">
                      <div 
                        className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-sm overflow-hidden group-hover:opacity-90 transition-opacity shadow-sm border cursor-pointer ${
                          task.status === 'completed' ? 'bg-green-500/20 border-green-500/30' :
                          task.status === 'running' ? 'bg-blue-500/20 border-blue-500/30' :
                          task.status === 'delayed' ? 'bg-destructive/20 border-destructive/30' :
                          'bg-muted border-border'
                        } ${isCritical ? 'ring-1 ring-destructive/50 ring-offset-1 ring-offset-background' : ''}`}
                        style={getTaskStyle(task.start, task.end)}
                      >
                        <div 
                          className={`h-full ${
                            task.status === 'completed' ? 'bg-green-500/60' :
                            task.status === 'running' ? 'bg-blue-500/60' :
                            task.status === 'delayed' ? 'bg-destructive/60' :
                            'bg-muted-foreground/20'
                          }`} 
                          style={{ width: `${task.progress}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-2 text-[10px] font-mono font-bold text-foreground/70 mix-blend-difference pointer-events-none">
                          {task.name}
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
