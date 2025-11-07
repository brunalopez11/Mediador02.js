// 1. MEDIADOR
class SIGAFake{
    constructor(){
        this.componentes = new Set();
        this.fila = [];
        this.livre = true;
    }

    registrar(comp){
        comp.setMediator(this); 
        this.componentes.add(comp);
    }

    buscar(nome){
        return [...this.componentes].find(c => 
            c.nome === nome);
    }

    notificar(rementente, tipo, dados = {}){
        const prioridade = dados.urgente ? 0 : 1;
        const evt = { rementente, tipo, dados, prioridade };
        
        if(prioridade === 0){
            this.fila.unshift(evt);
        }else{
            this.fila.push(evt);
        }
        this.processar();
    }

    processar(){
        if(!this.livre || this.fila.length === 0){
            return;
        }
        this.livre = false;

        const { rementente, tipo, dados } = this.fila.shift();

        if(tipo === "matricula"){
            const sec = this.buscar("Secretaria");
            console.log(`SECRETARIA: Matrica de ${dados.aluno.nome} em ${dados.curso}`);
            setTimeout(() => {sec.aprovarMatricula(dados); this.liberar();}, 3000);

        }else if( tipo === "matricula_ok"){
            dados.aluno.receber(`Matricula Confirmada em ${dados.curso}`);
            this.broadcast(rementente, `Matricula de ${dados.aluno.nome} em ${dados.curso} Concluido`);
            this.liberar();

        }else if( tipo === "inscricao_prova"){
            const provas = this.buscar("Provas");
            console.log(`PROVAS: Inscrição de ${dados.aluno.nome} em ${dados.disciplina}`);
            setTimeout(() => {provas.confirmarInscricao(dados); this.liberar();}, 3000);

        }else if(tipo === "inscricao_ok"){
            dados.aluno.receber(`Inscrição Confirmada em ${dados.disciplina}`);
            this.liberar();

        }else if(tipo === "lancar_nota"){
            const provas = this.buscar("Provas");
            console.log(`PROVAS: Lançar nota de ${dados.aluno.nome} em ${dados.disciplina}`);
            setTimeout(() => {provas.registrarNota(dados); this.liberar();}, 3000);

        }else if(tipo === "nota_publicada"){
            dados.aluno.receber(`Nota Publicada ${dados.disciplina} = ${dados.nota}`);
            this.liberar();
            
        }else if (tipo === "retificar_nota") {
            const provas = this.buscar("Provas");
            console.log(`Retificação (prioridade): ${dados.aluno.nome} em ${dados.disciplina}`);
            setTimeout(() => { provas.retificar(dados); this.liberar(); }, 3000);

        }else if (tipo === "retificacao_ok") {
            dados.aluno.receber(`Retificação concluída: ${dados.disciplina} = ${dados.novaNota}`);
            this.liberar();
        }
    }

    broadcast(remetente, msg) {
    for (const c of this.componentes) { 
        if (c !== remetente) c.receber?.(msg); 
    }
  }

    liberar(){
        this.livre = true; 
        this.processar();
    }
}

// 2. BASE:
class Componente{
    constructor(nome){
        this.nome = nome;
        this.mediator = null;
    }
    
    setMediator(m){
        this.mediator = m;
    }

    receber(msg){
        console.log(`[${this.nome}] ${msg}`); 
    }
}

// 3. COMPONENTES:
class Aluno extends Componente{
    constructor(nome){
        super(nome);
    }

    solicitarMatricula(curso){
        this.mediator.notificar(this, "matricula", {aluno: this, curso});
    }

    inscreverProva(disciplina){
        this.mediator.notificar(this, "inscricao_prova", {aluno: this, disciplina});
    }

    solicitarRetificacao(disciplina){
        this.mediator.notificar(this, "retificar_nota", {aluno: this, disciplina, urgente: true});
    }
}

class Professor extends Componente{
    constructor(nome){
        super(nome);
    }

    lancarNota(aluno, disciplina, nota){
        this.mediator.notificar(this, "lancar_nota", {
            professor: this, aluno, disciplina, nota
        });
    }
}

class Secretaria extends Componente {
  constructor() { 
    super("Secretaria"); 
}

  aprovarMatricula({ aluno, curso }) {
    console.log(`SECRETARIA: matrícula aprovada de ${aluno.nome} em ${curso}`);
    this.mediator.notificar(this, "matricula_ok", { aluno, curso });
  }
}

class Provas extends Componente{
    constructor(){
        super("Provas");
        this.notas = new Map();
    };

    chave(aluno, disciplina){
        return `${aluno.nome}::${disciplina}`;
    };

    confirmarInscricao({ aluno, disciplina }){
        console.log(`PROVAS: Inscrição OK de ${aluno.nome} em ${disciplina}`);
        this.mediator.notificar(this, "inscricao_ok", { aluno, disciplina });
    }

    registrarNota({ aluno, disciplina, nota }){
        this.notas.set(this.chave(aluno, disciplina), nota);
        console.log(`PROVAS: Nota Registrada de ${aluno.nome} em ${disciplina} = ${nota}`);
        this.mediator.notificar(this, "nota_publicada", { aluno, disciplina, nota });
    };

    retificar({ aluno, disciplina }){
        const chave = this.chave(aluno, disciplina);
        const antiga = this.notas.get(chave) ?? 0;
        const nova = Math.min(10, antiga + 1);
        this.notas.set(chave, nova);
        console.log(`PROVAS: Retificação de ${aluno.nome} em ${disciplina} ${antiga} -> ${nova}`);
        this.mediator.notificar(this, "retificacao_ok", { aluno, disciplina, novaNota: nova});
    };
};

// 4. USO DO SIGAFAKE:
(function demonstracao(){
    const sigafake = new SIGAFake();

    const aluno = new Aluno("Bruna");
    const prof = new Professor("Prof. Vinicius");
    const secretaria = new Secretaria();
    const provas = new Provas();

    [aluno, prof, secretaria, provas].forEach(c => sigafake.registrar(c));

    aluno.solicitarMatricula("DSM");
    aluno.inscreverProva("Python");
    prof.lancarNota(aluno, "Python", 8.5);
    aluno.solicitarRetificacao("Python");
})();