// @vitest-environment node
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {NextRequest,NextResponse} from 'next/server';
const mocks=vi.hoisted(()=>({auth:vi.fn(),org:vi.fn(),resolve:vi.fn(),templates:vi.fn(),query:vi.fn(),find:vi.fn(),findMany:vi.fn(),create:vi.fn(),update:vi.fn(),convUpdate:vi.fn(),fetch:vi.fn()}));
vi.mock('@/lib/api-auth',()=>({requireAuth:mocks.auth,requireOrgId:mocks.org}));
vi.mock('@/lib/whatsapp',()=>({whatsapp:{isConfigured:true,listTemplates:mocks.templates}}));
vi.mock('@/lib/whatsapp-inbound',()=>({resolveOrgForPhoneNumber:mocks.resolve}));
vi.mock('pg',()=>({Pool:class{connect=async()=>({query:mocks.query,release:vi.fn()});end=vi.fn()}}));
vi.mock('@/lib/prisma',()=>({prisma:{conversation:{findFirst:mocks.find,update:mocks.convUpdate},conversationMessage:{findMany:mocks.findMany,findFirst:vi.fn().mockResolvedValue(null),create:mocks.create,update:mocks.update}}}));
import {GET} from '../cron/licita-better/route';
const approved={name:'licita_better_relatorio_operacional_v1',status:'APPROVED',category:'UTILITY',language:'pt_BR'};
function request(query='?teste=teste-unico'){return new NextRequest('https://crm.aifluent.com.br/api/cron/licita-better'+query);}
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('LICITA_REPORT_TO','+13059303841');vi.stubEnv('LICITA_GESTAO_REPORT_TOKEN','f'.repeat(48));vi.stubEnv('LICITA_REPORT_ORG_ID','org');vi.stubEnv('DATABASE_URL','postgresql://fixture');vi.stubEnv('CRON_SECRET','fixture-secret-32-characters-long');
 mocks.auth.mockResolvedValue({session:{user:{organizationId:'org'}},error:null});mocks.org.mockReturnValue({orgId:'org',error:null});mocks.query.mockResolvedValue({rows:[{ok:true}]});mocks.templates.mockResolvedValue({templates:[approved]});mocks.find.mockResolvedValue({id:'conversa'});mocks.findMany.mockResolvedValue([]);mocks.create.mockResolvedValue({id:'msg'});mocks.update.mockImplementation(async({data})=>({id:'msg',...data}));
 mocks.fetch.mockImplementation(async(url:string)=>url.includes('institutoi10')?Response.json({texto:'Pendências confirmadas no painel',gerado_em:new Date().toISOString(),completo:false}):Response.json({messages:[{id:'wamid.fixture'}]}));vi.stubGlobal('fetch',mocks.fetch);
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
it('recusa chamada anônima antes de consultar a organização ou o banco',async()=>{const r=await GET(request(''));expect(r.status).toBe(401);expect(mocks.resolve).not.toHaveBeenCalled();expect(mocks.find).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled()});
it('recusa administrador de outra organização',async()=>{mocks.org.mockReturnValue({orgId:'outra',error:null});expect((await GET(request())).status).toBe(403);expect(mocks.fetch).not.toHaveBeenCalled()});
it('não envia se o template não estiver aprovado como UTILITY',async()=>{mocks.templates.mockResolvedValue({templates:[{...approved,category:'MARKETING'}]});expect((await GET(request())).status).toBe(409);expect(mocks.create).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled()});
it('usa destinatário fixado no servidor e mantém aceitação distinta de entrega',async()=>{const r=await GET(request());expect(r.status).toBe(200);const send=mocks.fetch.mock.calls.find(([url])=>String(url).includes('graph.facebook'));expect(JSON.parse(send![1].body).to).toBe('13059303841');expect(mocks.update.mock.calls[0][0].data.status).toBe('sent');expect((await r.json()).completo).toBe(false)});
it('recibo existente impede outro envio na mesma rodada',async()=>{mocks.findMany.mockResolvedValue([{id:'msg',status:'delivered',externalId:'wamid.fixture'}]);const r=await GET(request());expect((await r.json()).status).toBe('ja_processado');expect(mocks.fetch).not.toHaveBeenCalled();expect(mocks.create).not.toHaveBeenCalled()});
it('timeout após a tentativa fica incerto e nunca repete o POST',async()=>{mocks.fetch.mockImplementation(async(url:string)=>{if(url.includes('institutoi10'))return Response.json({texto:'Relatório',gerado_em:new Date().toISOString(),completo:false});throw new Error('timeout')});await GET(request());expect(mocks.fetch.mock.calls.filter(([url])=>String(url).includes('graph.facebook'))).toHaveLength(1);expect(mocks.update.mock.calls[0][0].data.status).toBe('incerto')});
it('relatório antigo não é enviado como atualizado',async()=>{mocks.fetch.mockResolvedValue(Response.json({texto:'Antigo',gerado_em:'2020-01-01T00:00:00Z'}));expect((await GET(request())).status).toBe(502);expect(mocks.create).not.toHaveBeenCalled()});
