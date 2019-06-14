// <copyright file="RetryHelper.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Common.Helpers
{
    using System;
    using System.Diagnostics;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models.Exceptions;

    /// <summary>
    /// Handles retry logic
    /// </summary>
    public static class RetryHelper
    {
        /// <summary>
        /// Retries a task a given number of times
        /// </summary>
        /// <param name="originalTask">the task without retry logic</param>
        /// <param name="retryCount">number of times to retry on exception</param>
        /// <param name="millisecondsBetweenRetries">number of milliseconds to wait between task attempts</param>
        /// <returns>A new task with retry logic</returns>
        public static Task RetryTask(Task originalTask, int retryCount = 5, int millisecondsBetweenRetries = 1000)
        {
            return Task.Run(async () =>
            {
                while (true)
                {
                    try
                    {
                        await originalTask;
                        return;
                    }
                    catch (Exception ex)
                    {
                        if (retryCount <= 0 || !ShouldRetry(ex))
                        {
                            throw;
                        }

                        // The message is always helpful, becuase we only retry for a BrowseCloudServiceException.
                        Trace.TraceWarning($"Task failed. Retry Count: {retryCount}, Message: {ex.Message}.");

                        retryCount--;

                        await Task.Delay(millisecondsBetweenRetries);
                    }
                }
            });
        }

        /// <summary>
        /// Retries a task a given number of times
        /// </summary>
        /// <typeparam name="T">Type returned by task</typeparam>
        /// <param name="originalTask">the task without retry logic</param>
        /// <param name="retryCount">number of times to retry on exception</param>
        /// <param name="millisecondsBetweenRetries">number of milliseconds to wait between task attempts</param>
        /// <returns>A new task with retry logic</returns>
        public static Task<T> RetryTask<T>(Task<T> originalTask, int retryCount = 5, int millisecondsBetweenRetries = 1)
        {
            return Task.Run(async () =>
            {
                while (true)
                {
                    try
                    {
                        return await originalTask;
                    }
                    catch (Exception ex)
                    {
                        if (retryCount <= 0 || !ShouldRetry(ex))
                        {
                            throw;
                        }

                        // The message is always helpful, becuase we only retry for a BrowseCloudServiceException.
                        Trace.TraceWarning($"Task failed. Retry Count: {retryCount}, Message: {ex.Message}.");

                        retryCount--;

                        await Task.Delay(millisecondsBetweenRetries);
                    }
                }
            });
        }

        /// <summary>
        /// Tests an exception to see if it should be retried
        /// </summary>
        /// <param name="ex">Exception to test</param>
        /// <returns></returns>
        private static bool ShouldRetry(Exception ex)
        {
            return ex is BrowseCloudServiceException;
        }
    }
}
