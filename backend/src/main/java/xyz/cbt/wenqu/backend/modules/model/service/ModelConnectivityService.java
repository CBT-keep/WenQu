package xyz.cbt.wenqu.backend.modules.model.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import xyz.cbt.wenqu.backend.common.BizException;
import xyz.cbt.wenqu.backend.modules.model.client.ModelConnection;
import xyz.cbt.wenqu.backend.modules.model.client.ModelProbeClient;
import xyz.cbt.wenqu.backend.modules.model.dto.ModelCreateDTO;
import xyz.cbt.wenqu.backend.modules.model.mapper.ModelMapper;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelTestVO;
import xyz.cbt.wenqu.backend.utils.CryptoUtil;

/**
 * 模型连通性服务
 */
@Service
@RequiredArgsConstructor
public class ModelConnectivityService {
    private final ModelMapper mapper;
    private final ModelService modelService;
    private final ModelProbeClient client;
    private final ObjectMapper json;
    private final CryptoUtil crypto;

    // 外部请求不占用数据库事务或行锁，也不保存草稿、修改默认标记或知识库索引状态。
    public ModelTestVO testSaved(long id) {
        if (id <= 0) throw BizException.badRequest("id 必须为正整数");

        // 数据库中查找配置
        var model = mapper.findConnection(id);
        if (model == null || !Boolean.TRUE.equals(model.enabled())) throw BizException.modelNotAvailable();

        // 构造ModelConnection，返回交给client.test
        return client.test(new ModelConnection(model.type(), model.baseUrl(), model.modelName(),
                crypto.decrypt(model.apiKeyCipher()), model.dimension(), model.temperature(), model.maxTokens(),
                model.timeoutMs(), json.readTree(model.extraParamsJson())));
    }

    public ModelTestVO testDraft(ModelCreateDTO dto) {
        modelService.validateCreateRules(dto);
        return client.test(new ModelConnection(dto.getType(), dto.getBaseUrl().trim(), dto.getModelName().trim(),
                dto.getApiKey(), dto.getDimension(), dto.getTemperature(), dto.getMaxTokens(),
                dto.getTimeoutMs() == null ? 60000 : dto.getTimeoutMs(), dto.getExtraParams()));
    }
}
