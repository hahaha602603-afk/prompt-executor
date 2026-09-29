// ERA monitored organizations (38). Tokens are generated per org on the server; never stored here.
export interface EraOrg {
  id: string;
  name: string;
  domain: string;
  organization_id: string;
  api_port: number;
  active: boolean;
}

export const ERA_ORGS: EraOrg[] = [
  { id: "aliancafarma", name: "ALIANCA FARMA DISTRIBUIDORA LTDA", domain: "aliancafarma.oktelecom.info", organization_id: "5a788d97-4026-4281-92e9-f14f28edbfe9", api_port: 4435, active: true },
  { id: "amorsaude", name: "CLINICA AMOR SAUDE", domain: "amorsaude.oktelecom.info", organization_id: "f60a674a-8c3e-490b-9aaa-1e4f0e16acb4", api_port: 4435, active: true },
  { id: "amorsaudelauro", name: "CLINICA AMOR SAUDE (LAURO DE FREITAS)", domain: "amorsaudelauro.oktelecom.info", organization_id: "da04b33c-0460-4f4a-ade2-5020093e9890", api_port: 4435, active: true },
  { id: "asx", name: "ASX COMERCIO LTDA", domain: "asx.oktelecom.info", organization_id: "e90c6e0f-790d-4c13-aade-0c5e5ccc25b3", api_port: 4435, active: true },
  { id: "brasilsoftware", name: "BRASIL SOFTWARE", domain: "brasilsoftware.oktelecom.info", organization_id: "f722bd56-fed0-494e-a40b-c42cb4ea63f4", api_port: 4435, active: true },
  { id: "cartaodetodos", name: "CARTAO DE TODOS SERRINHA", domain: "cartaodetodos.oktelecom.info", organization_id: "345d98e1-0348-4def-89be-1868c5188278", api_port: 4435, active: true },
  { id: "cartaodetodoslauro", name: "CARTAO DE TODOS EIRELI (LAURO DE FREITAS)", domain: "cartaodetodoslauro.oktelecom.info", organization_id: "b428e390-4c74-404a-9582-6dff61955ea8", api_port: 4435, active: true },
  { id: "clinicamquiteria", name: "CLINICA MEDICA MARIA QUITERIA", domain: "clinicamquiteria.oktelecom.info", organization_id: "3499455a-fe94-4121-b50f-5b2e6dca84b2", api_port: 4435, active: true },
  { id: "clof", name: "HOSPITAL CLOF LTDA", domain: "clof.oktelecom.info", organization_id: "d18eadba-391d-49dd-b8f7-10dd1cae22e9", api_port: 4435, active: true },
  { id: "drogariamegadescontao", name: "DROGARIAS MEGA DESCONTAO", domain: "drogariamegadescontao.oktelecom.info", organization_id: "db9aa160-dfe5-4c1b-af2c-fade7e8894f5", api_port: 4435, active: true },
  { id: "endocenter", name: "ENDOCENTER CENTRO MEDICO ESPECIALIZADO", domain: "endocenter.oktelecom.info", organization_id: "efa92d97-ebb0-4039-b431-b290cfbcb6d4", api_port: 4435, active: true },
  { id: "farmebrito", name: "FARME BRITO LTDA - FARMACIA BRITO", domain: "farmebrito.oktelecom.info", organization_id: "be032871-7c50-4f58-9927-2453860bf507", api_port: 4435, active: true },
  { id: "fitoplant", name: "FITOPLANT INDUSTRIA E COMERCIO LTDA", domain: "fitoplant.oktelecom.info", organization_id: "fa319252-6970-4f41-9a44-21a62318f02d", api_port: 4435, active: true },
  { id: "gastrolife", name: "GASTROLIFE DAY HOSPITAL", domain: "gastrolife.oktelecom.info", organization_id: "99b9ddbf-3dec-4ebf-a616-6cf44c48dc78", api_port: 4435, active: true },
  { id: "gastrosbahia", name: "GASTROS BAHIA DAY HOSPITAL", domain: "gastrosbahia.oktelecom.info", organization_id: "65ec6acc-5c67-4dfa-86bf-1863e7eb8f48", api_port: 4435, active: true },
  { id: "gruponobre", name: "GRUPO NOBRE - UNIFAN - UNEF", domain: "gruponobre.oktelecom.info", organization_id: "cc3b21c9-e49a-48f0-b33f-c54e0d336771", api_port: 4435, active: true },
  { id: "holhos", name: "H. OLHOS - HOSPITAL DE OLHOS LTDA", domain: "holhos.oktelecom.info", organization_id: "2102aa1e-a678-46c7-a6b8-37224a5489e4", api_port: 4435, active: true },
  { id: "hort", name: "HOSPITAL ORTOPEDICO LTDA", domain: "hort.oktelecom.info", organization_id: "136da0fc-43d5-4ba8-8d83-9fdaef7cec78", api_port: 4435, active: true },
  { id: "imme", name: "INSTITUTO DE ANGIOLOGIA E CARDIOLOGIA LTDA", domain: "imme.oktelecom.info", organization_id: "8e1ef67c-32d0-4215-9b86-cb5bde2e78e6", api_port: 4435, active: true },
  { id: "jeolog", name: "JEOLOG", domain: "jeolog.oktelecom.info", organization_id: "c3d80edf-f605-4a8a-a9f9-96895d56982f", api_port: 4435, active: true },
  { id: "luztransportes", name: "RODOVIARIO LUZ TRANSPORTES LTDA", domain: "luztransportes.oktelecom.info", organization_id: "026ab014-1750-44b0-a5f2-6b479cbfb486", api_port: 4435, active: true },
  { id: "mastersaude", name: "MASTER SERVICOS DE SAUDE LTDA", domain: "mastersaude.oktelecom.info", organization_id: "aeda1996-1a16-4c54-b5f0-5a54e7bd4770", api_port: 4435, active: true },
  { id: "medicalcenter", name: "MEDICAL CENTER DAY HOSPITAL LTDA", domain: "medicalcenter.oktelecom.info", organization_id: "66c1a905-34f3-42c6-8e2c-8222ef29c589", api_port: 4435, active: true },
  { id: "medtest", name: "MED TEST LABORATORIO DE ANALISES CLINICAS E PATOLOGIA LTDA", domain: "medtest.oktelecom.info", organization_id: "a50488f3-e27b-4449-b16b-36d5b60c3fa9", api_port: 4435, active: true },
  { id: "meudente", name: "MEU DENTE CLINICA ODONTOLOGICA LTDA", domain: "meudente.oktelecom.info", organization_id: "964b968b-939b-4f25-8142-6df95795a159", api_port: 4435, active: true },
  { id: "nonato", name: "NONATO CLINICA MEDICA", domain: "nonato.oktelecom.info", organization_id: "e9485bf0-df8a-41c0-8c03-654f2d58eeb1", api_port: 4435, active: true },
  { id: "oktelecom", name: "OKTELECOM TECNOLOGIA EM CONECTIVIDADE", domain: "oktelecom.oktelecom.info", organization_id: "5c344b71-3531-4a38-b5c9-fc883753883f", api_port: 4435, active: true },
  { id: "otorrinos", name: "HOSPITAL OTORRINOS DE FEIRA DE SANTANA LTDA", domain: "otorrinos.oktelecom.info", organization_id: "3b0536c3-3e46-432b-bd11-960aef420b41", api_port: 4435, active: true },
  { id: "paxbahia", name: "PAX BAHIA SAUDE LTDA", domain: "paxbahia.oktelecom.info", organization_id: "16f7108c-3e4c-4bd2-8619-9e5be56a12cb", api_port: 4435, active: true },
  { id: "postoalameda", name: "POSTO ALAMEDA - POSTO MENOR PREÇO", domain: "postoalameda.oktelecom.info", organization_id: "2f290790-5290-497a-8665-8f60da0e9675", api_port: 4435, active: true },
  { id: "primebahia", name: "PRIME BAHIA SERVICOS MEDICOS LTDA", domain: "primebahia.oktelecom.info", organization_id: "21010b22-f166-4f80-9e30-7ab8c0a7cd9b", api_port: 4435, active: true },
  { id: "prodiagnostico", name: "PRO-DIAGNOSTICO LABORATORIO DE ANALISES CLINICAS LTDA", domain: "prodiagnostico.oktelecom.info", organization_id: "d9bfe93a-a478-40d6-8d86-af20b7e75793", api_port: 4435, active: true },
  { id: "rafah", name: "CLINICA ELOHIM LTDA - RAFAH", domain: "rafah.oktelecom.info", organization_id: "ba028e24-6d36-4c06-a26b-08e62aba8e27", api_port: 4435, active: true },
  { id: "saudecenterconquista", name: "SAUDE CENTER (VITORIA DA CONQUISTA)", domain: "saudecenterconquista.oktelecom.info", organization_id: "5ad84daa-456d-4ee2-ad6d-ad58adddd635", api_port: 4435, active: true },
  { id: "saudecenterfeira", name: "SAUDE CENTER (FEIRA DE SANTANA)", domain: "saudecenterfeira.oktelecom.info", organization_id: "9b7b8d78-6655-4f6a-b569-14d12beda130", api_port: 4435, active: true },
  { id: "sestsenat", name: "SEST SENAT SERVICO SOCIAL DO TRANSPORTE", domain: "sestsenat.oktelecom.info", organization_id: "211eb9c5-24a0-4445-b0bb-9d074587928a", api_port: 4435, active: true },
  { id: "taqueta", name: "TAQUETA ADMINISTRACAO", domain: "taqueta.oktelecom.info", organization_id: "201c0923-1652-4f27-a669-389a734e2b55", api_port: 4435, active: true },
  { id: "vilfarma", name: "COMERCIAL DE MEDICAMENTO DO RECONCAVO LTDA - VILFARMA", domain: "vilfarma.oktelecom.info", organization_id: "626b0e3b-3b0b-43a1-a9e1-422d0a956292", api_port: 4435, active: true },
];

export const eraBase = (o: EraOrg) => `https://${o.domain}:${o.api_port}/api/v1`;
