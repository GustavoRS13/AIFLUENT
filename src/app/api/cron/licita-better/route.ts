import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual,createHash} from 'node:crypto';
import {Pool} from 'pg';
import {requireAuth,requireOrgId} from '@/lib/api-auth';
import {whatsapp} from '@/lib/whatsapp';
import {resolveOrgForPhoneNumber} from '@/lib/whatsapp-inbound';

export const runtime='nodejs';
export const maxDuration=300;
const SOURCE='https://www.institutoi10.com.br/licita360/api/v2/gestao/relatorio';
const TEMPLATE='licita_better_relatorio_operacional_v1';
function same(a:string,b:string){return Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function parts(text:string){
 const lines=text.split('\n'),out:string[]=[];let current='';
 for(const line of lines){let rest=line;while(rest.length>650){if(current){out.push(current);current='';}out.push(rest.slice(0,650));rest=rest.slice(650);}if(current.length+rest.length+1>650){out.push(current);current='';}current+=(current?'\n':'')+rest;}
 if(current)out.push(current);return out;
}
export async function GET(req:NextRequest){
 const cron=process.env.CRON_SECRET||'';
 const cronAuth=cron.length>=16&&same(req.headers.get('authorization')||'',`Bearer ${cron}`);
 const test=req.nextUrl.searchParams.get('teste');
 let sessionOrg:string|null=null;
 if(!cronAuth){
  if(!test||!/^[a-zA-Z0-9-]{8,80}$/.test(test))return NextResponse.json({error:'Não autorizado'},{status:401});
  const auth=await requireAuth('admin');if(auth.error)return auth.error;
  const org=requireOrgId(auth.session);if(org.error)return org.error;
  sessionOrg=org.orgId;
 }
 const {prisma}=await import('@/lib/prisma');
 const orgId=process.env.LICITA_REPORT_ORG_ID||await resolveOrgForPhoneNumber(prisma,process.env.WHATSAPP_PHONE_NUMBER_ID)||'';
 if(sessionOrg&&sessionOrg!==orgId)return NextResponse.json({error:'Organização inválida'},{status:403});
 const to=(process.env.LICITA_REPORT_TO||'').replace(/^\+/,'');
 const sourceToken=process.env.LICITA_GESTAO_REPORT_TOKEN||'';
 if(req.nextUrl.searchParams.get('preparar_modelo')==='1'){
  if(cronAuth||!test)return NextResponse.json({error:'Preparação requer sessão administrativa'},{status:403});
  const templates=await whatsapp.listTemplates();
  if(!('templates' in templates))return NextResponse.json({error:'Não foi possível consultar modelos'},{status:502});
  const found=templates.templates.find(t=>t.name===TEMPLATE);if(found)return NextResponse.json({template:found.name,status:found.status,category:found.category});
  const r=await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,{method:'POST',headers:{authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({name:TEMPLATE,category:'UTILITY',language:'pt_BR',components:[{type:'BODY',text:'Licita Better: relatório de acompanhamento solicitado para sua conta. Referência: {{1}}. Pendências e próximos compromissos: {{2}} Consulte os detalhes e as fontes no seu painel: https://www.institutoi10.com.br/licitabettertech#calendario. O registro na agenda não comprova envio de proposta, habilitação ou contratação.',example:{body_text:[['16/10/2026 07h — parte 1/1','Documentos TJGO: prazo em 16/10 às 08h30 de Brasília. Fonte: SISLOG. Responsável a confirmar.']]}}]}),signal:AbortSignal.timeout(20000)});
  const j=await r.json().catch(()=>null);return NextResponse.json({template:TEMPLATE,status:j?.status||'desconhecido',category:j?.category||null,error_code:j?.error?.code||null},{status:r.ok?200:502});
 }
 if(!orgId||!/^\d{10,15}$/.test(to)||sourceToken.length<32||!process.env.DATABASE_URL||!whatsapp.isConfigured)return NextResponse.json({error:'Integração ainda não configurada'},{status:503});
 const now=new Date(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).format(now));
 const round=[7,12,18].filter(h=>h<=hour).pop();
 if(!test&&round===undefined)return NextResponse.json({status:'fora_de_horario'});
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});
 const client=await pool.connect();let locked=false;
 try{
  const lock=await client.query('SELECT pg_try_advisory_lock(154211,1) AS ok');locked=lock.rows[0].ok;
  if(!locked)return NextResponse.json({status:'em_execucao'},{status:409});
  const conversation=await prisma.conversation.findFirst({where:{organizationId:orgId,channel:'whatsapp',phoneNumberId:null,lead:{OR:[{phone:to},{phone:'+'+to},{whatsapp:to},{whatsapp:'+'+to}]}},select:{id:true}});
  if(!conversation)return NextResponse.json({error:'Conversa exata do destinatário no canal padrão não encontrada'},{status:409});
  const runKey=createHash('sha256').update(JSON.stringify([orgId,day,test||round])).digest('hex');
  const previous=await prisma.conversationMessage.findMany({where:{conversationId:conversation.id,metadata:{contains:`"run":"${runKey}"`}},select:{id:true,status:true,externalId:true,errorCode:true},orderBy:{createdAt:'asc'}});
  if(previous.length)return NextResponse.json({status:'ja_processado',mensagens:previous,observacao:'Sem reenvio. Estados pending/incerto exigem conciliação; delivered/read confirmam entrega.'});
  const templateResult=await whatsapp.listTemplates();
  if(!('templates' in templateResult)||!templateResult.templates.some(t=>t.name===TEMPLATE&&t.status==='APPROVED'&&t.category==='UTILITY'&&t.language==='pt_BR'))return NextResponse.json({error:'Modelo operacional ainda não aprovado como UTILITY',template:TEMPLATE},{status:409});
  const source=await fetch(SOURCE,{headers:{authorization:`Bearer ${sourceToken}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!source.ok)return NextResponse.json({error:'Fonte Licita Better indisponível',status:source.status},{status:502});
  const report=await source.json();
  if(typeof report.texto!=='string'||report.texto.length>100000||!Number.isFinite(Date.parse(report.gerado_em))||Math.abs(Date.parse(report.gerado_em)-Date.now())>300000)return NextResponse.json({error:'Relatório inválido ou desatualizado'},{status:502});
  const chunks=parts(report.texto);if(chunks.length>100)return NextResponse.json({error:'Relatório excede limite de partes; revisar sem truncar'},{status:422});
  const results=[];
  for(let i=0;i<chunks.length;i++){
   const key=createHash('sha256').update(JSON.stringify([orgId,day,test||round,i])).digest('hex');
   const metadata=JSON.stringify({kind:'licita_better_report',key,run:runKey,partes:chunks.length});
   const prior=await prisma.conversationMessage.findFirst({where:{conversationId:conversation.id,metadata},select:{id:true,status:true,externalId:true,errorCode:true}});
   if(prior){results.push(prior);continue;}
   const reference=`${day} ${test?'teste':String(round).padStart(2,'0')+'h'} — parte ${i+1}/${chunks.length}`;
   const content=`Licita Better — ${reference}\n${chunks[i]}`;
   const msg=await prisma.conversationMessage.create({data:{conversationId:conversation.id,direction:'outbound',content,contentType:'text',status:'pending',metadata}});
   try{
    // Uma única tentativa. Timeout não autoriza reenvio porque pode já ter sido aceito.
    const r=await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'template',template:{name:TEMPLATE,language:{code:'pt_BR'},components:[{type:'body',parameters:[{type:'text',text:reference},{type:'text',text:chunks[i].replace(/\s+/g,' ').trim()}]}]}}),signal:AbortSignal.timeout(20000)});
    const j=await r.json().catch(()=>null),externalId=j?.messages?.[0]?.id;
    const accepted=r.ok&&typeof externalId==='string'&&externalId.startsWith('wamid.');
    const status=accepted?'sent':r.status>=400&&r.status<500?'failed':'incerto';
    const saved=await prisma.conversationMessage.update({where:{id:msg.id},data:{status,externalId:accepted?externalId:undefined,errorCode:j?.error?.code?String(j.error.code):undefined},select:{id:true,status:true,externalId:true,errorCode:true}});
    results.push(saved);if(!accepted)break;
   }catch{await prisma.conversationMessage.update({where:{id:msg.id},data:{status:'incerto'}});results.push({id:msg.id,status:'incerto'});break;}
  }
  await prisma.conversation.update({where:{id:conversation.id},data:{lastMessageAt:new Date()}});
  const current=await prisma.conversationMessage.findMany({where:{id:{in:results.map(m=>m.id)}},select:{id:true,status:true,externalId:true,errorCode:true}});
  return NextResponse.json({status:'processado',completo:report.completo,partes_previstas:chunks.length,mensagens:current,observacao:'sent confirma aceitação; delivered/read confirmam entrega via webhook do CRM.'});
 }catch{return NextResponse.json({error:'Falha na rotina; conferir registros antes de repetir'},{status:500});}
 finally{if(locked)await client.query('SELECT pg_advisory_unlock(154211,1)').catch(()=>{});client.release();await pool.end();}
}
