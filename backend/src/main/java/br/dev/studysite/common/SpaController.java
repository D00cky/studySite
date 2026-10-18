package br.dev.studysite.common;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Rotas da SPA (React Router) que chegam direto no servidor, como um F5 em /topicos/x:
 * devolve o index.html e o roteador do navegador assume. Só caminhos sem extensão e fora
 * de /api e /actuator; arquivos inexistentes continuam dando 404.
 */
@Controller
class SpaController {

    @GetMapping({"/{a:^(?!api$|actuator$)[^.]*$}", "/{a:^(?!api$|actuator$)[^.]*$}/{b:[^.]*}",
            "/{a:^(?!api$|actuator$)[^.]*$}/{b:[^.]*}/{c:[^.]*}"})
    String forward() {
        return "forward:/index.html";
    }
}
