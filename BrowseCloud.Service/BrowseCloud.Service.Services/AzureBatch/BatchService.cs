// <copyright file="BatchService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.AzureBatch
{
    using System.Diagnostics.Contracts;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Services.KeyVault;
    using Microsoft.Azure.Batch;
    using Microsoft.Azure.Batch.Auth;
    using Microsoft.Azure.Batch.Common;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// <inheritdoc />
    /// </summary>
    public class BatchService : IBatchService
    {
        private IKeyVaultService keyVaultService;
        private AzureBatchConfig config;
        private BatchSharedKeyCredentials credentials;
        private ILogger logger;
        private string poolId;
        private string jobId;

        /// <summary>
        /// Initializes a new instance of the <see cref="BatchService"/> class.
        /// </summary>
        /// <param name="keyVaultService">Key Vault Service</param>
        /// <param name="config">Config</param>
        /// <param name="logger">Logger</param>
        public BatchService(IKeyVaultService keyVaultService, IOptions<AzureBatchConfig> config, ILogger<BatchService> logger)
        {
            Contract.Requires(config != null, nameof(config));
            Contract.Requires(keyVaultService != null, nameof(keyVaultService));

            this.config = config.Value;
            this.keyVaultService = keyVaultService;
            this.logger = logger;
        }

        /// <inheritdoc/>
        public async Task StartJobWithTask(string taskId, string commandLineText)
        {
            await this.TryInit();

            try
            {
                using (var batchClient = BatchClient.Open(this.credentials))
                {
                    CloudJob job = await batchClient.JobOperations.GetJobAsync(this.jobId);

                    var task = new CloudTask(taskId, commandLineText);
                    task.UserIdentity = new UserIdentity(new AutoUserSpecification(AutoUserScope.Task, ElevationLevel.Admin));

                    await job.AddTaskAsync(task);
                }
            }
            catch (BatchException ex)
            {
                // Accept the specific error code JobExists as that is expected if the job already exists
                if (ex.RequestInformation?.BatchError?.Code == BatchErrorCodeStrings.TaskExists)
                {
                    throw new BrowseCloudServiceException($"The batch task {taskId} already existed when we tried to create it", ex);
                }
                else
                {
                    throw new BrowseCloudServiceException($"An unexpected error occurred while scheduling batch task {taskId}", ex);
                }
            }
        }

        /// <inheritdoc/>
        public async Task TerminateTask(string taskId)
        {
            await this.TryInit();

            try
            {
                using (var batchClient = BatchClient.Open(this.credentials))
                {
                    CloudJob job = await batchClient.JobOperations.GetJobAsync(this.jobId);
                    var task = await job.GetTaskAsync(taskId);
                    await task.TerminateAsync();
                }
            }
            catch (BatchException ex)
            {
                if (ex.RequestInformation?.BatchError?.Code == BatchErrorCodeStrings.TaskNotFound)
                {
                    // Do nothing. There is no task to delete and we don't really care.
                    this.logger.LogInformation($"Tried to delete batch task {taskId}, but there was no such task.");
                }
                else if (ex.RequestInformation?.BatchError?.Code == BatchErrorCodeStrings.TaskCompleted)
                {
                    // Do nothing. It is already finished.
                    this.logger.LogInformation($"Tried to delete batch task {taskId}, but it was already completed.");
                }
                else
                {
                    throw new BrowseCloudServiceException($"An unexpected error occurred while deleting batch task {taskId}", ex);
                }
            }
        }

        private async Task TryInit()
        {
            if (this.credentials == null)
            {
                if (string.IsNullOrWhiteSpace(this.config.AccountKeyKeyVaultKey))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"Batch:AccountKeyKV must be in the Application Settings.");
                }

                var accountKey = await this.keyVaultService.GetSecret(this.config.AccountKeyKeyVaultKey);

                if (string.IsNullOrWhiteSpace(accountKey))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"KeyVault key '{this.config.AccountKeyKeyVaultKey}' is not found in the KeyVault");
                }

                if (this.config.AccountUrl == null)
                {
                    throw new BrowseCloudAppSettingNotFoundException($"Batch:AccountUrl must be in the Application Settings.");
                }

                if (string.IsNullOrWhiteSpace(this.config.AccountName))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"Batch:AccountName must be in the Application Settings.");
                }

                // HACK: batch client can't accept a url with a '/' at the end.
                this.credentials = new BatchSharedKeyCredentials($"{this.config.AccountUrl.Scheme}://{this.config.AccountUrl.Authority}", this.config.AccountName, accountKey);
            }

            if (string.IsNullOrWhiteSpace(this.poolId))
            {
                if (string.IsNullOrWhiteSpace(this.config.PoolId))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"Batch:PoolId must be in the Application Settings.");
                }

                this.poolId = this.config.PoolId;
            }

            if (string.IsNullOrWhiteSpace(this.jobId))
            {
                if (string.IsNullOrWhiteSpace(this.config.JobId))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"Batch:JobId must be in the Application Settings.");
                }

                this.jobId = this.config.JobId;
            }
        }
    }
}
