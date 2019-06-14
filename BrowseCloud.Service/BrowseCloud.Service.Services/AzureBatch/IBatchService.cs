// <copyright file="IBatchService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.AzureBatch
{
    using System.Threading.Tasks;

    /// <summary>
    /// Handles requests to Azure Batch
    /// </summary>
    public interface IBatchService
    {
        /// <summary>
        /// Starts an Azure Batch Task in job specified in the config
        /// </summary>
        /// <param name="taskId">The name to give the batch task</param>
        /// <param name="commandLineText">The command to run on the remote machine</param>
        /// <returns></returns>
        Task StartJobWithTask(string taskId, string commandLineText);

        /// <summary>
        /// Terminates a task by taskId
        /// </summary>
        /// <param name="taskId">the batch task to terminate</param>
        /// <returns></returns>
        Task TerminateTask(string taskId);
    }
}
