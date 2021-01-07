# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import unittest
import numpy as np
import torch
import os
import cProfile
from CountingGridsPy.models import CountingGridModel, CountingGridModelWithGPU


class TimeGPUvsCPU(object):
    def __init__(self):
        SEED = "03071994"
        np.random.seed(int(SEED))
        M, N = [5000, 1000]
        extentSize = 40
        self.data = np.round(np.random.random((M, N)) * 10)
        self.extent = np.array([extentSize, extentSize])
        self.window = np.array([5, 5])
        self.pi_init = np.ones([extentSize] * 2 + [N]) / N
        self.cpuModel = CountingGridModel(self.extent, self.window)
        self.gpuModel = CountingGridModelWithGPU(self.extent, self.window)

    def run_nolayers(self):
        numIters = 50
        
        device = torch.device("cuda:0")
        outfileForGPU = "gpuProfile.txt"
        gpuJob = '''self.gpuModel.fit(
            self.data,
            max_iter=numIters,
            pi=torch.tensor(self.pi_init, device=device, dtype=torch.double),
            layers=1
        )
        '''
        cProfile.runctx(gpuJob, globals(), locals(), outfileForGPU)


        outfileForCPU = "cpuProfile.txt"
        cpuJob = '''self.cpuModel.fit(
            self.data,
            max_iter=numIters,
            returnSumSquareDifferencesOfPi=False,
            pi=np.copy(self.pi_init),
            layers=1
        )
        '''
        cProfile.runctx(cpuJob, globals(), locals(), outfileForCPU)

    def run_withlayers(self):
        numIters = 50
        
        device = torch.device("cuda:0")
        outfileForGPU = "gpu2LayersProfile.txt"
        gpuJob = '''self.gpuModel.fit(
            self.data,
            max_iter=numIters,
            pi=torch.tensor(self.pi_init, device=device, dtype=torch.double),
            layers=2,
            writeOutput=False
        )
        '''
        cProfile.runctx(gpuJob, globals(), locals(), outfileForGPU)


        outfileForCPU = "cpu2LayersProfile.txt"
        cpuJob = '''self.cpuModel.fit(
            self.data,
            max_iter=numIters,
            returnSumSquareDifferencesOfPi=False,
            pi=np.copy(self.pi_init),
            layers=2,
            writeOutput=False
        )
        '''
        cProfile.runctx(cpuJob, globals(), locals(), outfileForCPU)


if __name__ == "__main__":
    o = TimeGPUvsCPU()
    o.run_withlayers()
